
function FastPbrMaterial( name, baseUrl, rimlight, side = "front", envMap )
{   
    var mat = new zen3d.ShaderMaterial
    ({
        uniforms: 
        {
            indexOfRefraction: 1.0,
            shadowStrength: App.level.jsonData.mainLightShadowOpacity.valueOf(),
            rimLightPos: [ rimlight.position.x, rimlight.position.y, rimlight.position.z ], 
            rimLightCol: [ rimlight.color.r, rimlight.color.g, rimlight.color.b ],
            gold: 0.0
        },
        vertexShader: this.vert,
        fragmentShader: this.frag
    });

    mat.name = name;
    
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
    
    return mat;
}



FastPbrMaterial.prototype.vert = `

uniform mat4 u_View;
uniform mat4 u_Model;
uniform mat4 u_Projection;
uniform vec3 u_CameraPosition;

attribute vec3 a_Position;
attribute vec3 a_Normal;
attribute vec2 a_Uv;

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

#ifdef USE_SKINNING

    attribute vec4 skinIndex;
    attribute vec4 skinWeight;
    uniform mat4 bindMatrix;
    uniform mat4 bindMatrixInverse;

    #ifdef BONE_TEXTURE

        uniform sampler2D boneTexture;
        uniform int boneTextureSize;

        mat4 getBoneMatrix( const in float i ) 
        {
            float j = i * 4.0;
            float x = mod( j, float( boneTextureSize ) );
            float y = floor( j / float( boneTextureSize ) );

            float dx = 1.0 / float( boneTextureSize );
            float dy = 1.0 / float( boneTextureSize );

            y = dy * ( y + 0.5 );

            vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );
            vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );
            vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );
            vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );

            mat4 bone = mat4( v1, v2, v3, v4 );

            return bone;
        }
    #else
        uniform mat4 boneMatrices[MAX_BONES];

        mat4 getBoneMatrix(const in float i) 
        {
            mat4 bone = boneMatrices[int(i)];
            return bone;
        }
    #endif

#endif


void main() 
{
    vec3 pos_OS = a_Position;
    vec3 normal_OS = a_Normal;
    
    //------------------------------------------ skinned meshes
    #ifdef USE_SKINNING

        // transform vertex
        
        mat4 boneMatX = getBoneMatrix( skinIndex.x );
        mat4 boneMatY = getBoneMatrix( skinIndex.y );
        mat4 boneMatZ = getBoneMatrix( skinIndex.z );
        mat4 boneMatW = getBoneMatrix( skinIndex.w );

        vec4 skinVertex = bindMatrix * vec4( pos_OS, 1.0 );

        vec4 skinned = vec4( 0.0 );
        skinned += boneMatX * skinVertex * skinWeight.x;
        skinned += boneMatY * skinVertex * skinWeight.y;
        skinned += boneMatZ * skinVertex * skinWeight.z;
        skinned += boneMatW * skinVertex * skinWeight.w;
        skinned = bindMatrixInverse * skinned;

        pos_OS = skinned.xyz / skinned.w;

        // transform normal

        mat4 skinMatrix = mat4( 0.0 );
        skinMatrix += skinWeight.x * boneMatX;
        skinMatrix += skinWeight.y * boneMatY;
        skinMatrix += skinWeight.z * boneMatZ;
        skinMatrix += skinWeight.w * boneMatW;
        skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;

        normal_OS = vec4( skinMatrix * vec4( normal_OS, 0.0 ) ).xyz;

    #endif
    
    //------------------------------------------ normal
    normal_WS = normalize( ( u_Model * vec4( normal_OS, 0.0 ) ).xyz );

    //------------------------------------------ pos_WS
    pos_WS = u_Model * vec4( pos_OS, 1.0 );

    //------------------------------------------ viewdir_WS
    vec3 camDelta = u_CameraPosition - pos_WS.xyz;
    viewdir_WS = normalize( camDelta );
    lightdir_WS = normalize( -u_Directional[ 0 ].direction );
    halfdir_WS = normalize( viewdir_WS + lightdir_WS );
    lightcol = u_Directional[ 0 ].color.rgb; 

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
    v_uv = a_Uv;

    //------------------------------------------ output pos_CS
    gl_Position = u_Projection * u_View * pos_WS;
}
`


FastPbrMaterial.prototype.frag = `

// FastPbrMaterial frag

uniform float shadowStrength;
uniform vec3 rimLightPos;
uniform vec3 rimLightCol;

uniform vec3 u_CameraPosition;
uniform vec3 u_AmbientLightColor;
uniform float u_EnvMap_Intensity;
uniform int maxMipLevel;
uniform float gold;

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
    float fresnel = ( 1.0 - NoV ) * ( 1.0 - roughness );
    return fresnel * fresnel;
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
    //------------------------------------------ texture sampling
    vec4 albedo = texture2D( diffuseMap, v_uv );
    vec3 normalMap = texture2D( normalMap, v_uv ).rgb * 2.0 - 1.0;
    vec3 rmMap = texture2D( aoMap, v_uv ).rgb;

    //------------------------------------------ gold factor
    float gold_factor = rmMap.r * gold * 10.0 - ( 1.0 - gold ) * 0.2;
    gold_factor = clamp( gold_factor, 0.0, 1.0 );
    albedo.rgb = mix( albedo.rgb, vec3( 0.8, 0.6, 0.05 ), gold_factor );

    float roughness = rmMap.r * rmMap.r;
    float metalness = max( rmMap.g, gold_factor );
    float oneMinusMetalness = 1.0 - metalness;

    //------------------------------------------ prep
    vec4 rgba = vec4( 0.0, 0.0, 0.0, 1.0 );

    //------------------------------------------ calc tsp matrix
    mat3 tspace = tsn( normal_WS, pos_WS.xyz, vec2( v_uv.x, 1.0 - v_uv.y ) );
    vec3 normal = normalize( tspace * normalMap );

    //------------------------------------------ sample shadow
    float shadow = 1.0;

    #ifdef USE_SHADOW
        #if NUM_DIR_SHADOWS > 0
            shadow = getShadowCustom( directionalShadowMap[0], vDirectionalShadowCoord[0], u_Directional[0].shadowBias, 1.0, u_Directional[0].shadowMapSize );
        #endif
    #endif

    shadow = max( shadow, 1.0 - shadowStrength );

    //------------------------------------------ dirlight diffuse
    float NoL = clamp( dot( normal, lightdir_WS ), 0.0, 1.0 );
    vec3 diffuse = albedo.rgb * NoL * lightcol;

    //------------------------------------------ dirlight specular
    float NoH = clamp( dot( normal, halfdir_WS ), 0.0, 1.0 );
    float NoV = abs( dot( normal, viewdir_WS ) ) + 1e-5;
    float spec_D = D_GGX( NoH, roughness );
    float spec_V = V_GGX( NoV, NoL, roughness );
    float spec_DV = spec_D * spec_V;
    vec3 specular = spec_DV * lightcol;

    rgba.rgb += ( diffuse + specular * shadow ) * oneMinusMetalness * shadow;   // multiply spec with shadow twice, because spec is too strong

    // ambient
    rgba.rgb += albedo.rgb * u_AmbientLightColor;

    //------------------------------------------ dirlight 2 diffuse
    NoL = clamp( dot( normal, rimLightPos ), 0.0, 1.0 );
    rgba.rgb += albedo.rgb * NoL * rimLightCol;

    //------------------------------------------ environment map

    #ifdef TEXTURE_LOD_EXT
        vec3 envMap = textureCubeLodEXT( envMap, reflect_WS + normal, RoughnessToMipLevel( roughness, maxMipLevel ) ).rgb;
    #else
        vec3 envMap = textureLod( envMap, reflect_WS + normal, RoughnessToMipLevel( roughness, maxMipLevel ) ).rgb;
    #endif

    envMap *= u_EnvMap_Intensity;

    float fresnel = F_Fast( NoV, roughness );
    vec3 envAdd = mix( rgba.rgb, envMap, fresnel );
    rgba.rgb = max( rgba.rgb, envAdd );
    
    //------------------------------------------ metalness
    rgba.rgb += max( metalness - NoV * 0.8, 0.0 ) * ( envMap + spec_DV * 2.0 * albedo.rgb );

    //------------------------------------------ fog
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

    //------------------------------------------ final color
    gl_FragColor = vec4( rgba.rgb, albedo.a );
}

`

