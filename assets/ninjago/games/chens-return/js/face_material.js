

function FaceMaterial( albedoImageUrl, sheetData, envMap )
{   
    let mat = new zen3d.ShaderMaterial
    ({
        uniforms:
        { 
            shadowStrength:  App.level.jsonData.mainLightShadowOpacity.valueOf(), 
            indexOfRefraction: 1.0
        },
        vertexShader: this.vert,
        fragmentShader: this.frag
    });

    let albedo = zen3d.Texture2D.fromSrc( App.loader.extract( albedoImageUrl ) );
    albedo.flipY = false;
    
    mat.diffuseMap = albedo;    
    mat.envMap = envMap;
    mat.acceptLight = true;
    mat.transparent = true;
    mat.depthWrite = true;
    mat.depthTest = true;
    //mat.diffuseMap.repeat.x = sheetData.tileW / sheetData.texW;
    //mat.diffuseMap.repeat.y = sheetData.tileH / sheetData.texH;
    
    // tex data
    mat.texW = sheetData.texW;
    mat.texH = sheetData.texH;
    mat.tileW = sheetData.tileW / sheetData.texW;
    mat.tileH = sheetData.tileH / sheetData.texH;
    mat.rows = Math.floor( sheetData.texH / sheetData.tileH );
    mat.cols = Math.floor( sheetData.texW / sheetData.tileW );
    mat.total = mat.rows * mat.cols;
    
    mat.setFrame = function( frame )
    {
        let col = frame % this.cols;
        let row = Math.floor( frame / this.cols );

        this.diffuseMap.offset.x = col * this.tileW;
        this.diffuseMap.offset.y = row * this.tileH;
    }
    
    return mat;
}

FaceMaterial.prototype.vert = `

uniform mat4 u_View;
uniform mat4 u_Model;
uniform mat4 u_Projection;
uniform vec3 u_CameraPosition;

attribute vec3 a_Position;
attribute vec3 a_Normal;
attribute vec2 a_Uv;
uniform mat3 uvTransform;

varying vec4 pos_WS;
varying vec3 normal_WS;
varying vec3 viewdir_WS;
varying vec3 lightdir_WS;
varying vec3 halfdir_WS;
varying vec3 lightcol;
varying vec2 v_uv;
varying vec3 reflect_WS;



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
    // out pos_WS

    pos_WS = u_Model * vec4( a_Position, 1.0 );
    
    // out viewdir_WS

    vec3 camDelta = u_CameraPosition - pos_WS.xyz;
    viewdir_WS = normalize( camDelta );
    lightdir_WS = normalize( -u_Directional[ 0 ].direction );
    halfdir_WS = normalize( viewdir_WS + lightdir_WS );
    lightcol = u_Directional[ 0 ].color.rgb;

    // normal_WS

    normal_WS = normalize( ( u_Model * vec4( a_Normal, 0.0 ) ).xyz );

    // out reflection vector

    reflect_WS = - reflect( viewdir_WS, normal_WS );

    // shadows

    #ifdef USE_SHADOW
        #if NUM_DIR_SHADOWS > 0

            #pragma unroll_loop
            for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) 
            {
                vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * pos_WS;
            }

        #endif
    #endif
    
    // output uvs

    v_uv = ( uvTransform * vec3( a_Uv, 1.0 ) ).xy;
    
    // output pos_CS

    gl_Position = u_Projection * u_View * pos_WS;
}
`



FaceMaterial.prototype.frag = `

// FaceMaterial frag

uniform float shadowStrength;
uniform float indexOfRefraction;

uniform vec3 u_CameraPosition;
uniform vec3 u_AmbientLightColor;
uniform float u_EnvMap_Intensity;
uniform int maxMipLevel;

uniform sampler2D diffuseMap;
uniform samplerCube envMap;

varying vec4 pos_WS;
varying vec3 normal_WS;
varying vec3 viewdir_WS;
varying vec3 lightdir_WS;
varying vec3 halfdir_WS;
varying vec3 lightcol;
varying vec2 v_uv;
varying vec3 reflect_WS;

#include <packing>

#ifdef USE_SHADOW
    #if NUM_DIR_SHADOWS > 0

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
    float fresnel = ( 1.0 - NoV ) * ( 1.0 - roughness );
    float factor = 2.0 - indexOfRefraction;
    return fresnel * mix( 1.0, fresnel, factor );
}

float RoughnessToMipLevel( float rgh, int maxMipLevel )
{
    float maxMipFloat = float( maxMipLevel );
    return min( maxMipFloat, floor( rgh * 10.0 ) );
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
    // texture sampling

    vec4 albedo = texture2D( diffuseMap, v_uv );

    float roughness = 0.1;
    float metalness = 0.0;
    float oneMinusMetalness = 1.0 - metalness;

    // prep

    vec4 rgba = vec4( 0.0, 0.0, 0.0, 1.0 );

    // calc tsp matrix

    vec3 normal = normal_WS;

    // sample shadow

    float shadow = 1.0;

    #ifdef USE_SHADOW
        #if NUM_DIR_SHADOWS > 0
            shadow = getShadowCustom( directionalShadowMap[0], vDirectionalShadowCoord[0], u_Directional[0].shadowBias, 1.0, u_Directional[0].shadowMapSize );
        #endif
    #endif

    shadow = max( shadow, 1.0 - shadowStrength );

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

    rgba.rgb += ( diffuse + specular ) * oneMinusMetalness * shadow;

    // ambient
    rgba.rgb += albedo.rgb * u_AmbientLightColor;

    // dirlight 2 diffuse

    vec3 lightdir2_WS = normalize( vec3( -10.0, 0.0, 0.0 ) );
    vec3 lightcol2 = vec3( 0.39, 0.27, 0.24 );

    NoL = clamp( dot( normal, lightdir2_WS ), 0.0, 1.0 );
    rgba.rgb += albedo.rgb * NoL * lightcol2;

    // environment map

    #ifdef TEXTURE_LOD_EXT
        vec3 envMap = textureCubeLodEXT( envMap, reflect_WS + normal, RoughnessToMipLevel( roughness, maxMipLevel ) ).rgb;
    #else
        vec3 envMap = textureLod( envMap, reflect_WS + normal, RoughnessToMipLevel( roughness, maxMipLevel ) ).rgb;
    #endif

    float fresnel = F_Fast( NoV, roughness );
    vec3 envAdd = mix( rgba.rgb, envMap, fresnel );
    rgba.rgb = max( rgba.rgb, envAdd );
    
    // metalness
    rgba.rgb += max( metalness - NoV * 0.8, 0.0 ) * ( envMap + spec_DV * 2.0 * albedo.rgb );

    // fog

    #ifdef USE_FOG

        float depth = gl_FragCoord.z / gl_FragCoord.w;
        
        #ifdef USE_EXP2_FOG
            float fogFactor = whiteCompliment( exp2( - u_FogDensity * u_FogDensity * depth * depth * LOG2 ) );
        #else
            float fogFactor = smoothstep( u_FogNear, u_FogFar, depth );
        #endif

        rgba.rgb = mix( rgba.rgb, u_FogColor, fogFactor );

        // fade shadow depending on fog distance

        shadow *= fogFactor;

    #endif

    // final color

    gl_FragColor = vec4( rgba.rgb, albedo.a );
}

`