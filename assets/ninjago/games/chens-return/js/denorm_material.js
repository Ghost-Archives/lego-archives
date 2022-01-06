
function DeNormMaterial( name, baseUrl, envMap, normalScale, transparent, side )
{    
    // create material    
    var mat = new zen3d.ShaderMaterial
    ({
        uniforms: 
        {
            // [ aoIntensity, shadowOpacity, environmentIntensity, normalScale ]
            props: [ 1, 1, 1, normalScale ],
            mipBias: 0
        },
        vertexShader: this.vert,
        fragmentShader: this.frag
    });
    
    mat.name = name; 

    // create textures
    let albedoMap = zen3d.Texture2D.fromSrc( App.loader.extract( baseUrl + '_aa.png' ) );
    albedoMap.flipY = false;
    //albedoMap.encoding = zen3d.TEXEL_ENCODING_TYPE.SRGB;
    let normalMap = zen3d.Texture2D.fromSrc( App.loader.extract( baseUrl + '_nnmr.png' ) );
    normalMap.flipY = false;
    
    mat.diffuseMap = albedoMap;
    mat.normalMap = normalMap;
    mat.envMap = envMap;    
    mat.acceptLight = true;
    
    if ( transparent )
    {
        mat.transparent = true;
        mat.depthTest = true;
        mat.depthWrite = true;
        //mat.side = "back";
        mat.blending = zen3d.BLEND_TYPE.CUSTOM;
        mat.blendSrc = zen3d.BLEND_FACTOR.SRC_COLOR;
        mat.blendDst = zen3d.BLEND_FACTOR.ONE_MINUS_SRC_ALPHA;
    }
    
    // done
    return mat;
}



DeNormMaterial.prototype.vert = `

uniform mat4 u_View;
uniform mat4 u_Model;
uniform mat4 u_Projection;
uniform vec3 u_CameraPosition;
uniform mat3 uvTransform;

attribute vec3 a_Position;
attribute vec3 a_Normal;
attribute vec2 a_Uv;

varying vec4 pos_WS;
varying vec3 normal_WS;
varying vec3 viewdir_WS;
varying vec3 halfdir_WS;
varying vec3 reflect_WS;
varying vec2 v_uv;



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
    normal_WS = ( u_Model * vec4( a_Normal, 0.0 ) ).xyz;                 // normal_WS: no normalization needed

    #ifdef FLIP_SIDED
    	normal_WS = -normal_WS;
    #endif

    //------------------------------------------ pos_WS
    pos_WS = u_Model * vec4( a_Position, 1.0 );

    //------------------------------------------ viewdir_WS
    vec3 camDelta = u_CameraPosition - pos_WS.xyz;
    viewdir_WS = normalize( camDelta );
    halfdir_WS = normalize( viewdir_WS - u_Directional[ 0 ].direction );

    //------------------------------------------ reflection vector
    reflect_WS = - reflect( viewdir_WS, normal_WS );

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
    camDist *= 0.0005;
    pos_WS.y -= camDist * camDist;

    //------------------------------------------ uvs
    v_uv = ( uvTransform * vec3( a_Uv, 1.0 ) ).xy;

    //------------------------------------------ output pos_CS
    gl_Position = u_Projection * u_View * pos_WS;
}
`


DeNormMaterial.prototype.frag = `

uniform vec4 props;
uniform float mipBias;

uniform vec3 u_CameraPosition;
uniform vec3 u_AmbientLightColor;
uniform float u_EnvMap_Intensity;
uniform vec3 u_Color;
uniform int maxMipLevel;

uniform sampler2D diffuseMap;
uniform sampler2D normalMap;
uniform samplerCube envMap;

varying vec4 pos_WS;
varying vec3 normal_WS;
varying vec3 viewdir_WS;
varying vec3 halfdir_WS;
varying vec3 reflect_WS;
varying vec2 v_uv;



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
    float f = ( NoH2 * roughness - NoH2 ) * NoH2 + 1.0;
    return roughness / ( 3.1415 * f * f );
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
    return min( fresnel * fresnel * fresnel, 0.5 );
}

float RoughnessToMipLevel( float rgh, int maxMipLevel )
{
    float maxMipFloat = float( maxMipLevel );
    //return min( maxMipFloat, floor( rgh * 14.0 ) );
    return min( maxMipFloat, floor( rgh * 24.0 ) );
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

vec3 SurfgradFromTBN( vec2 deriv, vec3 vT, vec3 vB )
{
    return deriv.x * vT + deriv.y * vB;
}





void main() 
{
    //------------------------------------------ prep
    vec4 rgba = vec4( 0.0, 0.0, 0.0, 0.0 );
    float shadow = 1.0;
    vec3 one3 = vec3( 1.0 );
    
    //------------------------------------------ texture sampling
    vec4 albedo = texture2D( diffuseMap, v_uv, mipBias );
    vec4 nnmr = texture2D( normalMap, v_uv, mipBias );
    vec2 normalMap = nnmr.rg * 2.0 - 1.0;

    if ( albedo.a > 0.1 )
    {
        //------------------------------------------ srgb to linear
        albedo.rgb *= albedo.rgb;
        rgba.a = albedo.a;
        
        float metalness = nnmr.b;
        float oneMinusMetalness = 1.0 - metalness;
        //float roughness = max( nnmr.a * 0.8, 0.01 );
        float roughness = max( nnmr.a, 0.01 );
        float roughness2 = roughness * roughness;

        //------------------------------------------ calc tsp matrix
        mat3 tspace = tsn( normal_WS, pos_WS.xyz, vec2( v_uv.x, 1.0 - v_uv.y ) );
        vec3 surfgrad = SurfgradFromTBN( normalMap.rg, vec3( tspace[0][0], tspace[0][1], tspace[0][2] ), vec3( tspace[1][0], tspace[1][1], tspace[1][2] ) );
        surfgrad *= props[3];
        vec3 normal = normalize( normal_WS - surfgrad );

        //------------------------------------------ sample shadow
        #ifdef USE_SHADOW
            #if NUM_DIR_SHADOWS > 0
                shadow = getShadowCustom( directionalShadowMap[0], vDirectionalShadowCoord[0], u_Directional[0].shadowBias, 1.0, u_Directional[0].shadowMapSize );
            #endif
        #endif

        shadow = max( shadow, 1.0 - props[0] );
        vec3 coloredShadow = mix( u_AmbientLightColor, one3, shadow );

        //------------------------------------------ prepare dirlight
        vec3 dirlight_color = max( u_Directional[ 0 ].color.rgb, 0.0 );
        float dirlight_power = min( ( dirlight_color.r + dirlight_color.g + dirlight_color.b ) * 0.3333, 1.0 );

        //------------------------------------------ dirlight diffuse
        float NoV = abs( dot( normal, viewdir_WS ) ) + 1e-5;
        float NoL = clamp( dot( normal, - u_Directional[0].direction ), 0.0, 1.0 );
        float NoH = clamp( dot( normal, halfdir_WS ), 0.0, 1.0 );
        vec3 diffuse = albedo.rgb * NoL;

        //------------------------------------------ dirlight specular
        float D = D_GGX( NoH, roughness2 );
        float V = V_GGX( NoV, NoL, roughness2 );
        float specular = D * V * NoL * dirlight_power;
        rgba.rgb += ( diffuse + specular ) * dirlight_color * coloredShadow;

        //------------------------------------------ sample environment map
        #ifdef TEXTURE_LOD_EXT
            vec3 environment = textureCubeLodEXT( envMap, reflect_WS - surfgrad, RoughnessToMipLevel( roughness, maxMipLevel ) ).rgb;
        #else
            vec3 environment = textureLod( envMap, reflect_WS - surfgrad, RoughnessToMipLevel( roughness, maxMipLevel ) ).rgb;
        #endif

        // gamma correction & strength
        environment *= environment * u_EnvMap_Intensity;     

        //------------------------------------------ indirect diffuse lighting (?)
        rgba.rgb += environment * albedo.rgb * ( 1.0 - NoL * dirlight_power ) * min( roughness2 + 0.1, 1.0 ) * props[2];
        //rgba.rgb += environment * albedo.rgb * ( 1.0 - NoL * dirlight_power );

        //------------------------------------------ metalness mask
        rgba.rgb *= oneMinusMetalness;

        //------------------------------------------ metalness
        //rgba.rgb += ( environment + specular * 1.5 + roughness2 * 0.3 ) * albedo.rgb * metalness;  // rouhgness add is wrong, but looks good...
        rgba.rgb += ( environment + specular * 3.0 + roughness2 ) * albedo.rgb * metalness;          // rouhgness add is wrong, but looks good...

        //------------------------------------------ fresnel
        float fresnel = F_Fast( NoV, roughness );
        rgba.rgb += environment * fresnel;
        //rgba.rgb += Saturation( environment, 0.25 ) * fresnel;                // difference is not that big

        //------------------------------------------ ambient
        vec3 ambient = albedo.rgb * u_AmbientLightColor;
        rgba.rgb += ambient * oneMinusMetalness + ambient * 0.5 * metalness;

        //------------------------------------------ horizon ao
        float aoFactor = max( dot( mix( normal, normal_WS, 0.7 ), vec3( 0.0, -1.0, 0.0 ) ), 0.0 );
        aoFactor = aoFactor * aoFactor * props[1];
        vec3 ao = mix( one3, u_AmbientLightColor, aoFactor );
        rgba.rgb *= ao;

        //------------------------------------------ post saturation
        rgba.rgb = Saturation( rgba.rgb, 1.2 );

        //------------------------------------------ linear to srgb
        rgba.rgb = sqrt( rgba.rgb );

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
    };

    //------------------------------------------ final color
    gl_FragColor = rgba;

}

`

