
function BillboardMaterial( diffuseMap, color )
{   
    var mat = new zen3d.ShaderMaterial
    ({
        vertexShader: this.vert,
        fragmentShader: this.frag
    });

    if ( diffuseMap )
    {
        diffuseMap.flipY = false;
        mat.diffuseMap = diffuseMap;
        mat.transparent = true;
        mat.depthWrite = false;
        mat.depthTest = true;
        mat.blending = zen3d.BLEND_TYPE.CUSTOM;
        mat.blendSrc = zen3d.BLEND_FACTOR.SRC_ALPHA;
        mat.blendDst = zen3d.BLEND_FACTOR.ONE_MINUS_SRC_ALPHA;
    }
    
    if ( color )
    {
        mat.diffuse = color;
    }
    else
    {
        mat.diffuse = new zen3d.Color3( 0xFFFFFF );
    }

    return mat;
}

function BillboardGeometry( w, h )
{    
    let t_verts = [ -0.5 * w, 0.5 * h, 0.0, -0.5 * w, -0.5 * h, 0.0, 0.5 * w, -0.5 * h, 0.0, 0.5 * w, 0.5 * h, 0.0 ];
    let t_uvs = [ 0, 0, 0, 1, 1, 1, 1, 0 ];
    let t_indices = [ 0, 1, 2, 0, 2, 3 ];
    
    let geo = new zen3d.Geometry();
    geo.addAttribute( "a_Position", new zen3d.BufferAttribute( new Float32Array( t_verts ), 3 ) );
    geo.addAttribute( "a_Uv", new zen3d.BufferAttribute( new Float32Array( t_uvs ), 2 ) );
    geo.index = new zen3d.BufferAttribute( new Uint16Array( t_indices ), 1 );
    
    return geo;
}


BillboardMaterial.prototype.vert = `

uniform mat4 u_View;
uniform mat4 u_Model;
uniform mat4 u_Projection;
uniform vec3 u_CameraPosition;

attribute vec3 a_Position;
attribute vec2 a_Uv;

varying vec2 uv;






void main() 
{
    // compute origin

    vec3 origin_WS = vec4( u_Model * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
    vec3 forward = normalize( origin_WS.xyz - u_CameraPosition );
    vec3 up = vec3( 0.0, 1.0, 0.0 );
    vec3 right = normalize( cross( forward, up ) );
    
    vec3 scale = vec3( 0.0, 0.0, 0.0 );
    scale.x = sqrt( u_Model[0][0] * u_Model[0][0] + u_Model[0][1] * u_Model[0][1] + u_Model[0][2] * u_Model[0][2] );
    scale.y = sqrt( u_Model[1][0] * u_Model[1][0] + u_Model[1][1] * u_Model[1][1] + u_Model[1][2] * u_Model[1][2] );
    scale.z = sqrt( u_Model[2][0] * u_Model[2][0] + u_Model[2][1] * u_Model[2][1] + u_Model[2][2] * u_Model[2][2] );

    vec3 pos = a_Position * scale;

    origin_WS += pos.x * right;
    origin_WS += pos.y * up;
    origin_WS += pos.z * forward;

    // output pos_CS

    gl_Position = u_Projection * u_View * vec4( origin_WS, 1.0 );


    // uvs

    uv = a_Uv;
}
`



BillboardMaterial.prototype.frag = `


#ifdef USE_DIFFUSE_MAP
    uniform sampler2D diffuseMap;
#endif

uniform vec3 u_Color;
varying vec2 uv;




void main() 
{
    vec4 albedo = vec4( 1.0, 1.0, 1.0, 1.0 );
    
    #ifdef USE_DIFFUSE_MAP
        albedo = texture2D( diffuseMap, uv );
    #endif

    albedo.rgb *= u_Color;

    gl_FragColor = albedo;
}

`

