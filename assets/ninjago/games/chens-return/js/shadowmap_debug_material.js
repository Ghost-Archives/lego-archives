
function ShadowmapDebugMaterial( alpha )
{   
    var mat = new zen3d.ShaderMaterial
    ({
        vertexShader: this.vert,
        fragmentShader: this.frag,
        uniforms: { alpha: alpha }
    });
    
    mat.acceptLight = true;
    mat.transparent = true;
    
    return mat;
}


ShadowmapDebugMaterial.prototype.vert = `


uniform mat4 u_View;
uniform mat4 u_Model;
uniform mat4 u_Projection;

attribute vec3 a_Position;
attribute vec2 a_Uv;

varying vec2 v_uv;







void main() 
{
    // uvs

    v_uv = a_Uv;

    // output pos_CS

    gl_Position = u_Projection * u_View * u_Model * vec4( a_Position, 1.0 );
}
`



ShadowmapDebugMaterial.prototype.frag = `

uniform float alpha;

varying vec2 v_uv;





#ifdef USE_SHADOW
    #if NUM_DIR_SHADOWS > 0
        uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHTS ];
        varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHTS ];

        #ifdef USE_PCSS_SOFT_SHADOW
            uniform sampler2D directionalDepthMap[ NUM_DIR_LIGHTS ];
        #endif
    #endif
#endif




void main() 
{
    float shadow = 1.0;
    float inc = 0.05;
    int cnt = 0;

    for ( float i = 0.0; i <= 1.0; i += inc )
    {
        cnt++;
        shadow -= texture2D( directionalShadowMap[ 0 ], v_uv ).a * inc;
    }

    gl_FragColor = vec4( shadow, shadow, shadow, alpha );

}

`

