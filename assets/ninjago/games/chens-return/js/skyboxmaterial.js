
function SkyboxMaterial( diffuse )
{   
    var mat = new zen3d.ShaderMaterial
    ({
        vertexShader: this.fastlit_vert,
        fragmentShader: this.fastlit_frag
    });
    
    diffuse.repeat.x = -1;
    diffuse.offset.x = -0.35;
    diffuse.offset.y = -0.3;

    mat.diffuseMap = diffuse;    
    mat.acceptLight = false;
    
    return mat;
}


SkyboxMaterial.prototype.fastlit_vert = `


precision lowp float;
precision lowp int;

uniform mat4 u_View;
uniform mat4 u_Model;
uniform mat4 u_Projection;

attribute vec3 a_Position;
attribute vec2 a_Uv;

varying vec2 v_uv;





void main() 
{
    // out uvs

    v_uv = a_Uv;

    // out pos

    gl_Position = u_Projection * u_View * u_Model * vec4( a_Position, 1.0 );
}
`



SkyboxMaterial.prototype.fastlit_frag = `



precision lowp float;

uniform sampler2D diffuseMap;

varying vec2 v_uv;



void main() 
{
    // texture sampling
    
    vec4 diffuse = texture2D( diffuseMap, v_uv );
    
    // out color

    gl_FragColor = diffuse;
}
`

