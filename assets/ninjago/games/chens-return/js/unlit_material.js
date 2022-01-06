

function QuadGeometry( pivot )
{
    if ( !pivot ) pivot = new zen3d.Vector3();
    
    let verts = [ -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5 ];
    //let normals = [ 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1 ];
    let uvs = [ 0, 0, 0, 1, 1, 1, 1, 0 ];
    let indices = [ 0, 2, 1, 0, 3, 2 ];
    
    for ( let i = 0; i < verts.length; i+=3 )
    {
        verts[i] += pivot.x;
        verts[i+1] += pivot.y;
        verts[i+2] += pivot.z;
    }
    
    let geo = new zen3d.Geometry();
    geo.addAttribute( "a_Position", new zen3d.BufferAttribute( new Float32Array( verts ), 3 ) );
    //geo.addAttribute( "a_Normal", new zen3d.BufferAttribute( new Float32Array( normals ), 3 ) );
    geo.addAttribute( "a_Uv", new zen3d.BufferAttribute( new Float32Array( uvs ), 2 ) );
    geo.index = new zen3d.BufferAttribute( new Uint16Array( indices ), 1 );
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    
    return geo;
}



// ------------------------------------------------------------------------------------------------------------
// MATERIAL ---------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------

function UnlitMaterial( name, albedo, horizon )
{    
    horizon = horizon || 0;
    
    let mat = new zen3d.ShaderMaterial
    ({
        vertexShader: this.vert,
        fragmentShader: this.frag,
        uniforms: 
        {
            horizon: horizon
        }
    });

    if ( albedo )
    {
        albedo = zen3d.Texture2D.fromSrc( App.loader.extract( albedo ) );
        albedo.flipY = false;
        mat.diffuseMap = albedo;
    }

    mat.name = name;
    mat.diffuse = new zen3d.Color3( 0xffffff );
    
    return mat;
}


UnlitMaterial.prototype.vert = `

uniform mat4 u_View;
uniform mat4 u_Model;
uniform mat4 u_Projection;
uniform vec3 u_CameraPosition;

uniform float horizon;

attribute vec3 a_Position;
attribute vec2 a_Uv;

varying vec2 uv;




void main() 
{
    vec4 pos_WS = u_Model * vec4( a_Position, 1.0 );
    
    //------------------------------------------ transform y depending on camera distance
    vec3 camDelta = u_CameraPosition - pos_WS.xyz;
    float camDist = camDelta.x * camDelta.x + camDelta.y * camDelta.y + camDelta.z * camDelta.z;
    camDist *= horizon;
    pos_WS.y -= camDist * camDist;
    
    // output uvs
    uv = a_Uv;
    
    // output pos_CS
    gl_Position = u_Projection * u_View * pos_WS;
}
`



UnlitMaterial.prototype.frag = `

uniform sampler2D diffuseMap;
uniform vec3 u_Color;

varying vec2 uv;





// --------------------------------------------------------- functions

vec3 Saturation( vec3 rgb, float adjustment )
{
    const vec3 W = vec3( 0.2125, 0.7154, 0.0721 );
    vec3 intensity = vec3( dot( rgb, W ) );
    return mix( intensity, rgb, adjustment );
}

// --------------------------------------------------------- main

void main() 
{
    // texture sampling
    vec4 albedo = texture2D( diffuseMap, uv );

    // color correction with magic number. why? dont know!
    //albedo.rgb *= 1.4;

    // multiply diffuseColor
    albedo.rgb *= u_Color;

    // final color
    gl_FragColor = albedo;
}

`