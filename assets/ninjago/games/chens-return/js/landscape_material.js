
function LandscapeMaterial( name, baseUrl, rimlight, side = "front", envMap, aoIntensity )
{    
    // create material
    var mat = new zen3d.ShaderMaterial
    ({
        uniforms: 
        {
            brightness: 1.0,
            aoIntensity: aoIntensity,
            shadowStrength: App.level.jsonData.mainLightShadowOpacity.valueOf(),
            rimLightPos: [ rimlight.position.x, rimlight.position.y, rimlight.position.z ], 
            rimLightCol: [ rimlight.color.r, rimlight.color.g, rimlight.color.b ]
        },
        vertexShader: this.vert,
        fragmentShader: this.frag
    });
    
    mat.name = name;
    mat.side = side;
    
    // create textures
    let albedoMap = zen3d.Texture2D.fromSrc( App.loader.extract( baseUrl + '_aa.png' ) );
    albedoMap.flipY = false;
    let normalMap = zen3d.Texture2D.fromSrc( App.loader.extract( baseUrl + '_n.png' ) );
    normalMap.flipY = false;
    let rmMap = zen3d.Texture2D.fromSrc( App.loader.extract( baseUrl + '_rm.png' ) );
    rmMap.flipY = false;
    
    mat.diffuseMap = albedoMap;
    mat.normalMap = normalMap;
    mat.aoMap = rmMap;
    mat.envMap = envMap;
    mat.acceptLight = true;
    
    // done
    return mat;
}



LandscapeMaterial.prototype.vert = `



uniform mat4 u_View;
uniform mat4 u_Model;
uniform mat4 u_Projection;
uniform vec3 u_CameraPosition;
uniform vec3 rimLightPos;

attribute vec3 a_Position;
attribute vec3 a_Normal;
attribute vec2 a_Uv;

varying vec4 pos_WS;
varying vec3 normal_WS;
varying vec4 viewdir_WS;
varying vec3 lightdir_WS;
varying vec3 halfdir_WS;
varying vec2 v_uv;
varying vec3 reflect_WS;
varying vec3 rimLightPos_WS;



#if NUM_DIR_LIGHTS > 0

    struct DirectLight
    {
        vec3 direction;
        vec4 color;

        int shadow;
        float shadowBias;
        float shadowRadius;
        vec2 shadowMapSize;
    };

    uniform DirectLight u_Directional[ NUM_DIR_LIGHTS ];

#endif

#ifdef USE_SHADOW

    #if NUM_DIR_SHADOWS > 0

        uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHTS ];
        varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHTS ];

    #endif

#endif




void main() 
{
    //------------------------------------------ prep
    normal_WS = normalize( ( u_Model * vec4( a_Normal, 0.0 ) ).xyz );

    #ifdef FLIP_SIDED
    	normal_WS = -normal_WS;
    #endif

    //------------------------------------------ pos_WS
    pos_WS = u_Model * vec4( a_Position, 1.0 );

    //------------------------------------------ viewdir_WS
    vec3 camDelta = u_CameraPosition - pos_WS.xyz;
    viewdir_WS = vec4( normalize( camDelta ), 0.0 );
    lightdir_WS = normalize( -u_Directional[ 0 ].direction );
    halfdir_WS = normalize( viewdir_WS.xyz + lightdir_WS );

    //------------------------------------------ rimLightPos_WS
    vec3 up = vec3( 0.0, 1.0, 0.0 );
    vec3 right = cross( viewdir_WS.xyz, up );
    rimLightPos_WS += rimLightPos.x * right;
    rimLightPos_WS += rimLightPos.y * up;
    rimLightPos_WS += rimLightPos.z * viewdir_WS.xyz;
    rimLightPos_WS = normalize( rimLightPos_WS );

    //------------------------------------------ reflection vector
    reflect_WS = - reflect( viewdir_WS.xyz, normal_WS );

    //------------------------------------------ shadows
    #ifdef USE_SHADOW
        #if NUM_DIR_SHADOWS > 0

            #pragma unroll_loop
            for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) 
            {
                vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * pos_WS;
            }

        #endif
    #endif

    //------------------------------------------ transform y depending on camera distance
    float camDist = camDelta.x * camDelta.x + camDelta.y * camDelta.y + camDelta.z * camDelta.z;
    viewdir_WS.w = camDist;
    camDist *= 0.0005;
    pos_WS.y -= camDist * camDist;
    //float camDist = camDelta.z * camDelta.z * 0.0005;

    //------------------------------------------ uvs
    v_uv = a_Uv;

    //------------------------------------------ output pos_CS
    gl_Position = u_Projection * u_View * pos_WS;
}
`


LandscapeMaterial.prototype.frag = `

// LandscapeMaterial frag

uniform float shadowStrength;
uniform vec3 rimLightCol;
uniform float brightness;
uniform float aoIntensity;

uniform vec3 u_CameraPosition;
uniform vec3 u_AmbientLightColor;
uniform float u_EnvMap_Intensity;
uniform vec3 u_Color;
uniform int maxMipLevel;

uniform sampler2D diffuseMap;
uniform sampler2D normalMap;
uniform sampler2D aoMap;
uniform samplerCube envMap;

varying vec4 pos_WS;
varying vec3 normal_WS;
varying vec4 viewdir_WS;
varying vec3 lightdir_WS;
varying vec3 halfdir_WS;
varying vec2 v_uv;
varying vec3 reflect_WS;
varying vec3 rimLightPos_WS;


#include <packing>

#if NUM_DIR_LIGHTS > 0

    struct DirectLight
    {
        vec3 direction;
        vec4 color;

        int shadow;
        float shadowBias;
        float shadowRadius;
        vec2 shadowMapSize;
    };

    uniform DirectLight u_Directional[ NUM_DIR_LIGHTS ];

#endif

#ifdef USE_SHADOW
    #if NUM_DIR_SHADOWS > 0

        #include <shadow>

        uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHTS ];
        varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHTS ];

    #endif
#endif

#ifdef USE_FOG

    uniform vec3 u_FogColor;

    #ifdef USE_EXP2_FOG
        uniform float u_FogDensity;
    #else
        uniform float u_FogNear;
        uniform float u_FogFar;
    #endif

#endif

#include <tsn>





float D_GGX( float NoH, float roughness )
{
    float NoH2 = NoH * NoH;
    float f = ( NoH * roughness - NoH ) * NoH + 1.0;
    //float f = NoH2 * roughness - NoH2 + 1.0;
    return roughness / ( 3.141592 * f * f );
}

float V_GGX( float NoV, float NoL, float roughness )
{
    float GGXV = NoL * ( NoV * ( 1.0 - roughness ) + roughness );
    float GGXL = NoV * ( NoL * ( 1.0 - roughness ) + roughness );
    return 0.5 / ( GGXV + GGXL );
}

float F_Fast( float NoV, float roughness )
{
    float fresnel = ( 1.0 - NoV ) * ( 1.0 - roughness );
    return fresnel * fresnel;
}

float RoughnessToMipLevel( float rgh, int maxMipLevel )
{
    float maxMipFloat = float( maxMipLevel );
    return clamp( floor( rgh * 12.0 ), 0.0, maxMipFloat );
}

vec3 Saturation(vec3 rgb, float adjustment)
{
    const vec3 W = vec3( 0.2125, 0.7154, 0.0721 );
    vec3 intensity = vec3( dot( rgb, W ) );
    return mix( intensity, rgb, adjustment );
}

float getShadowCustom( sampler2DShadow shadowMap, vec4 shadowCoord, float shadowBias, float shadowRadius, vec2 shadowMapSize ) 
{
    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.z += shadowBias;

    bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
    bool inFrustum = all( inFrustumVec );

    bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );
    bool frustumTest = all( frustumTestVec );

    if ( frustumTest ) 
    {
        return step( shadowCoord.z, unpackRGBAToDepth( texture2D( shadowMap, shadowCoord.xy ) ) );
    };

    return 1.0;
}


void main() 
{
    //------------------------------------------ prep
    vec4 rgba = vec4( 0.0, 0.0, 0.0, 1.0 );
    float shadow = 1.0;
    float shadow_2 = 1.0;
    
    //------------------------------------------ texture sampling
    vec4 albedo = texture2D( diffuseMap, v_uv );
    vec3 normalMap = texture2D( normalMap, v_uv ).rgb * 2.0 - 1.0;
    vec3 rmMap = texture2D( aoMap, v_uv ).rgb;

if ( albedo.a > 0.1 )
{
    // color correction ( for parity between C4D and png: 1.4 )
    albedo.rgb *= brightness;

    float roughness = rmMap.r;
    float roughness2 = rmMap.r * rmMap.r;
    float metalness = rmMap.g;
    float oneMinusMetalness = 1.0 - metalness;

    float normalScalar = 1.0;
    
    if ( !gl_FrontFacing )
    {
        normalScalar = -1.0;
    }

    //------------------------------------------ calc tsp matrix
    mat3 tspace = tsn( normal_WS * normalScalar, pos_WS.xyz, vec2( v_uv.x, 1.0 - v_uv.y ) );
    vec3 normal = normalize( tspace * normalMap );

    //------------------------------------------ pseudo ao
    float aoFactor = max( dot( mix( normal, normal_WS, 0.7 ), vec3( 0.0, -1.0, 0.0 ) ), 0.0 );
    aoFactor *= aoFactor * aoIntensity;
    aoFactor = 1.0 - clamp( aoFactor, 0.0, 1.0 );
    
    //------------------------------------------ sample shadow
    #ifdef USE_SHADOW

        #if NUM_DIR_SHADOWS > 0
            shadow = getShadowCustom( directionalShadowMap[0], vDirectionalShadowCoord[0], u_Directional[0].shadowBias, 1.0, u_Directional[0].shadowMapSize );

        #endif
        #if NUM_DIR_SHADOWS > 1
            shadow *= getShadowCustom( directionalShadowMap[1], vDirectionalShadowCoord[1], u_Directional[0].shadowBias, 1.0, u_Directional[1].shadowMapSize );
        #endif

    #endif

    shadow = max( shadow, 1.0 - shadowStrength );
    float shadowFar = viewdir_WS.w * 0.001;
    shadow = min( 1.0, shadow + shadowFar * shadowFar );

    //------------------------------------------ dirlight diffuse
    float NoV = abs( dot( normal, viewdir_WS.xyz ) ) + 1e-5;
    float NoL = clamp( dot( normal, lightdir_WS ), 0.0, 1.0 );
    float NoH = clamp( dot( normal, halfdir_WS ), 0.0, 1.0 );
    vec3 diffuse = albedo.rgb * NoL * u_Directional[ 0 ].color.rgb;

    //------------------------------------------ dirlight specular
    float D = D_GGX( NoH, roughness2 );
    float V = V_GGX( NoV, NoL, roughness2 );
    float specular = D * V * NoL * NoL;
    rgba.rgb += ( diffuse + specular ) * u_Directional[ 0 ].color.rgb * oneMinusMetalness * shadow;

    //------------------------------------------ dirlight 2 diffuse
    float NoL_2 = clamp( dot( normal, rimLightPos_WS ), 0.0, 1.0 );
    NoL_2 = max( NoL, NoL_2 );
    rgba.rgb += albedo.rgb * NoL_2 * rimLightCol * oneMinusMetalness * aoFactor;

    //------------------------------------------ ambient
    rgba.rgb += albedo.rgb * u_AmbientLightColor * aoFactor;

    //------------------------------------------ environment map

    #ifdef TEXTURE_LOD_EXT
        vec3 envMap = textureCubeLodEXT( envMap, reflect_WS, RoughnessToMipLevel( roughness, maxMipLevel ) ).rgb;
    #else
        vec3 envMap = texture2D( envMap, reflect_WS, RoughnessToMipLevel( roughness, maxMipLevel ) ).rgb;
    #endif

    float fresnel = F_Fast( NoV, roughness );
    //vec3 envAdd = mix( rgba.rgb, envMap, fresnel );
    //rgba.rgb = max( rgba.rgb, envAdd );
    rgba.rgb += envMap * fresnel * oneMinusMetalness;

    //------------------------------------------ metalness
    rgba.rgb += ( envMap + specular * 2.0 ) * albedo.rgb * metalness;

    //------------------------------------------ fog
    #ifdef USE_FOG

        float depth = gl_FragCoord.z / gl_FragCoord.w;

        #ifdef USE_EXP2_FOG
            float fogFactor = whiteCompliment( exp2( - u_FogDensity * u_FogDensity * depth * depth * LOG2 ) );
        #else
            float fogFactor = smoothstep( u_FogNear, u_FogFar, depth );
        #endif

        rgba.rgb = mix( rgba.rgb, u_FogColor, fogFactor );

    #endif

    //rgba.rgb = vec3( aoFactor );
}

    //------------------------------------------ final color
    gl_FragColor = vec4( rgba.rgb, albedo.a );

}

`

