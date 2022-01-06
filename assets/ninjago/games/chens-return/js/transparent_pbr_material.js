
function TransparentMaterial( name, baseUrl, rimlight, side = "front", envMap )
{   
    var mat = new zen3d.ShaderMaterial
    ({
        uniforms: 
        { 
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

    let albedoMap = new zen3d.Texture2D.fromSrc( App.loader.extract( baseUrl + '_aa.png' ) );
    albedoMap.flipY = false;
    mat.diffuseMap = albedoMap;
    
    let normalMap = new zen3d.Texture2D.fromSrc( App.loader.extract( baseUrl + '_n.png' ) );
    normalMap.flipY = false;
    mat.normalMap = normalMap;

    let rmMap = new zen3d.Texture2D.fromSrc( App.loader.extract( baseUrl + '_rm.png' ) );
    rmMap.flipY = false;
    mat.aoMap = rmMap;

    mat.envMap = envMap;
    mat.acceptLight = true;
    
    mat.vertexColors = zen3d.VERTEX_COLOR.RGBA;
    mat.transparent = true;
    mat.depthWrite = true;
    mat.depthTest = true;
    mat.blending = zen3d.BLEND_TYPE.CUSTOM;
    mat.blendSrc = zen3d.BLEND_FACTOR.SRC_COLOR;
    mat.blendDst = zen3d.BLEND_FACTOR.ONE_MINUS_SRC_ALPHA;
    
    return mat;
}


TransparentMaterial.prototype.vert = `



uniform mat4 u_View;
uniform mat4 u_Model;
uniform mat4 u_Projection;
uniform vec3 u_CameraPosition;

attribute vec3 a_Position;
attribute vec3 a_Normal;
attribute vec2 a_Uv;
attribute vec4 a_Color;

varying vec4 pos_WS;
varying vec3 normal_WS;
varying vec3 viewdir_WS;
varying vec3 lightdir_WS;
varying vec3 halfdir_WS;
varying vec3 lightcol;
varying vec2 v_uv;
varying vec3 reflect_WS;
varying vec4 vertexColor;



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
        varying vec2 shadowMapSize[ NUM_DIR_LIGHTS ];

    #endif

#endif


void main() 
{
    // prep

    normal_WS = normalize( ( u_Model * vec4( a_Normal, 0.0 ) ).xyz );

    #ifdef FLIP_SIDED
    	normal_WS = -normal_WS;
    #endif

    // out pos_WS

    pos_WS = u_Model * vec4( a_Position, 1.0 );

    // out viewdir_WS

    vec3 camDelta = u_CameraPosition - pos_WS.xyz;
    viewdir_WS = normalize( camDelta );
    lightdir_WS = normalize( -u_Directional[ 0 ].direction );
    halfdir_WS = normalize( viewdir_WS + lightdir_WS );
    lightcol = u_Directional[ 0 ].color.rgb; 

    // out reflection vector

    reflect_WS = - reflect( viewdir_WS, normal_WS );

    // shadows

    #ifdef USE_SHADOW
        #if NUM_DIR_SHADOWS > 0

            #pragma unroll_loop
            for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) 
            {
                vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * pos_WS;
                shadowMapSize[ i ] = u_Directional[ i ].shadowMapSize;
            }

        #endif
    #endif

    // transform y depending on camera distance

    float camDist = camDelta.x * camDelta.x + camDelta.y * camDelta.y + camDelta.z * camDelta.z;
    camDist *= 0.0003;
    pos_WS.y -= camDist * camDist;

    // uvs

    v_uv = a_Uv;

    // vertex color

    vertexColor = a_Color;

    // output pos_CS

    gl_Position = u_Projection * u_View * pos_WS;
}
`



TransparentMaterial.prototype.frag = `

uniform float shadowStrength;
uniform vec3 rimLightPos;
uniform vec3 rimLightCol;

uniform vec3 u_AmbientLightColor;
uniform float u_EnvMap_Intensity;
uniform int maxMipLevel;

uniform sampler2D diffuseMap;
uniform sampler2D normalMap;
uniform sampler2D aoMap;
uniform samplerCube envMap;

varying vec4 pos_WS;
varying vec3 normal_WS;
varying vec3 viewdir_WS;
varying vec3 lightdir_WS;
varying vec3 halfdir_WS;
varying vec3 lightcol;
varying vec2 v_uv;
varying vec3 reflect_WS;
varying vec4 vertexColor;

#include <packing>

#ifdef USE_SHADOW

    #if NUM_DIR_SHADOWS > 0

        uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHTS ];
        varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHTS ];
        varying vec2 shadowMapSize[ NUM_DIR_LIGHTS ];

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
    float f = ( NoH * roughness - NoH ) * NoH + 1.0;
    return roughness / ( 3.1415926 * f * f );
}

float V_GGX( float NoV, float NoL, float roughness ) 
{
    float GGXV = NoL * ( NoV * ( 1.0 - roughness ) + roughness );
    float GGXL = NoV * ( NoL * ( 1.0 - roughness ) + roughness );
    return 0.5 / ( GGXV + GGXL ) * NoL;
}

float F_Fast( float NoV, float roughness )
{
    return ( 1.0 - NoV ) * ( 1.0 - roughness );
}

float RoughnessToMipLevel( float rgh, int maxMipLevel )
{
    float maxMipFloat = float( maxMipLevel );
    return min( maxMipFloat, floor( rgh * 10.0 ) );
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
    // texture sampling

    vec4 albedo = texture2D( diffuseMap, v_uv );
    albedo.rgb *= vertexColor.rgb;

    vec3 normalMap = texture2D( normalMap, v_uv ).rgb * 2.0 - 1.0;
    vec3 rmMap = texture2D( aoMap, v_uv ).rgb;

    float roughness = rmMap.r * rmMap.r;
    float metalness = rmMap.g;
    float oneMinusMetalness = 1.0 - metalness;

    // prep

    vec4 rgba = vec4( 0.0, 0.0, 0.0, albedo.a );

    // calc tsp matrix

    mat3 tspace = tsn( normal_WS, pos_WS.xyz, vec2( v_uv.x, 1.0 - v_uv.y ) );
    vec3 normal = normalize( tspace * normalMap );

    // shadow

    float shadow = 1.0;

/*
    #ifdef USE_SHADOW
        #if NUM_DIR_SHADOWS > 0
            shadow = getShadowCustom( directionalShadowMap[0], vDirectionalShadowCoord[0], -0.0002, 1.0, shadowMapSize[0] );
        #endif
    #endif

    shadow = max( shadow, 1.0 - shadowStrength );
*/

    // dirlight diffuse

    float NoL = clamp( dot( normal, lightdir_WS ), 0.0, 1.0 );
    vec3 diffuse = albedo.rgb * NoL * lightcol;

    // dirlight specular

    float NoH = clamp( dot( normal, halfdir_WS ), 0.0, 1.0 );
    float NoV = abs( dot( normal, viewdir_WS ) ) + 1e-5;
    float spec_D = D_GGX( NoH, roughness );
    float spec_V = V_GGX( NoV, NoL, roughness );
    float spec_DV = spec_D * spec_V;
    vec3 specular = spec_DV * lightcol;

    rgba.rgb += ( diffuse + specular ) * shadow;

    // ambient
    rgba.rgb += albedo.rgb * u_AmbientLightColor;

    //------------------------------------------ dirlight 2 diffuse
    NoL = clamp( dot( normal, rimLightPos ), 0.0, 1.0 );
    rgba.rgb += albedo.rgb * NoL * rimLightCol;

    // environment map

    #ifdef TEXTURE_LOD_EXT
        vec3 envMap = textureCubeLodEXT( envMap, reflect_WS + normal, RoughnessToMipLevel( roughness, maxMipLevel ) ).rgb;
    #else
        vec3 envMap = textureLod( envMap, reflect_WS + normal, RoughnessToMipLevel( roughness, maxMipLevel ) ).rgb;
    #endif

    float fresnel = F_Fast( NoV, roughness );
    rgba.rgb = max( envMap * fresnel, rgba.rgb );

    // fog

    #ifdef USE_FOG

        float depth = gl_FragCoord.z / gl_FragCoord.w;
        
        #ifdef USE_EXP2_FOG
            float fogFactor = whiteCompliment( exp2( - u_FogDensity * u_FogDensity * depth * depth * LOG2 ) );
        #else
            float fogFactor = smoothstep( u_FogNear, u_FogFar, depth );
        #endif

        rgba.rgb = mix( rgba.rgb, u_FogColor, fogFactor );

    #endif

    // alpha

    rgba.a += ( 1.0 - NoV ) * 0.5;

    // stronger color response

    rgba.rgb += albedo.rgb * NoV * 0.5;

    // final color

    gl_FragColor = rgba;
}

`

