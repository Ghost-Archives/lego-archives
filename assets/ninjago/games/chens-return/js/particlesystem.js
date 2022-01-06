'use strict';


function ParticleSystem( options )
{
    // setup    
    this.time = 0;
    this.opacity = 1;

    this.num = options.num;
    this.emitterSize = options.emitterSize;
    this.origin = options.origin;

    this.velocityRange = options.velocityRange;
    this.velocityRange.delta = this.velocityRange.max.clone().subtract( this.velocityRange.min );
    this.scaleRange = options.scaleRange;
    this.scaleRange.delta = this.scaleRange.max - this.scaleRange.min;
    this.lifetimeRange = options.lifetimeRange;
    this.lifetimeRange.delta = this.lifetimeRange.max - this.lifetimeRange.min;
    this.timeOffsetRange = options.timeOffsetRange;
    this.timeOffsetRange.delta = this.timeOffsetRange.max - this.timeOffsetRange.min;
    this.alphaRange = options.alphaRange;
    this.alphaRange.delta = this.alphaRange.max - this.alphaRange.min;
    this.concentric = options.concentric;
    
    this.fadein = options.fadein;
    this.fadeout = options.fadeout;
    this.scaleOverTime = options.scaleOverTime;
    this.rotateOverTime = options.rotateOverTime;

    // material
    this.mat = new ParticleMaterial( options.img );
    this.mat.vertexColors = zen3d.VERTEX_COLOR.RGBA;
    this.mat.vertexTangents = true;
    this.mat.blending = options.blending;
    this.mat.uniforms.timing[2] = options.loop;
    
    this.end = 0;
    
    let t_verts = [ -0.5, 0.5, 0.0, -0.5, -0.5, 0.0, 0.5, -0.5, 0.0, 0.5, 0.5, 0.0 ];
    let t_uvs = [ 0, 0, 0, 1, 1, 1, 1, 0 ];
    let t_indices = [ 0, 1, 2, 0, 2, 3 ];
    
    let verts = [];
    let uvs = [];
    let indices = [];
    let velocities = [];
    let lifedata = [];
    let scaleRotateOverTime = [];
    
    let i;
    let v;
    let scale;
    let velocity = { x: 0, y: 0, z: 0 };
    let emitter = { x: 0, y: 0, z: 0 };

    let timeOffset;
    let lifetime;
    
    
    for( i = 0; i < this.num; i++ )
    {
        // vertices
        
        scale = this.scaleRange.min + Math.random() * this.scaleRange.delta;

        emitter.x = this.origin.x + ( Math.random() * 2 - 1 ) * this.emitterSize.x;
        emitter.y = this.origin.y + ( Math.random() * 2 - 1 ) * this.emitterSize.y;
        emitter.z = this.origin.z + ( Math.random() * 2 - 1 ) * this.emitterSize.z;
        
        for ( v = 0; v < 12; v += 3 )
        {            
            verts.push( t_verts[ v+0 ] * scale + emitter.x );
            verts.push( t_verts[ v+1 ] * scale + emitter.y );
            verts.push( t_verts[ v+2 ] * scale + emitter.z );
        }
        
        // uvs
        
        for ( v = 0; v < 8; v++ )
        {      
            uvs.push( t_uvs[ v ] );
        }
        
        // indices
        
        for ( v = 0; v < 6; v++ )
        {      
            indices.push( t_indices[ v ] + i * 4 );
        }
        
        // velocities
        
        velocity.x = this.velocityRange.min.x + Math.random() * this.velocityRange.delta.x;
        velocity.y = this.velocityRange.min.y + Math.random() * this.velocityRange.delta.y;
        velocity.z = this.velocityRange.min.z + Math.random() * this.velocityRange.delta.z;
        
        for ( v = 0; v < 4; v++ )
        {
            velocities.push( velocity.x );
            velocities.push( velocity.y );
            velocities.push( velocity.z );
        }
        
        // timeOffset, lifetime, fadein, fadeout
        
        lifetime = this.lifetimeRange.min + Math.random() * this.lifetimeRange.delta;
        timeOffset = this.timeOffsetRange.min * i + Math.random() * this.timeOffsetRange.delta;        
        this.end = Math.max( this.end, timeOffset + lifetime );
        
        for ( v = 0; v < 4; v++ )
        {
            lifedata.push( lifetime );
            lifedata.push( timeOffset );
            lifedata.push( this.fadein );
            lifedata.push( this.fadeout );
        }
        
        // scaleOverTime, rotateOverTime
        
        for ( v = 0; v < 4; v++ )
        {
            scaleRotateOverTime.push( this.scaleOverTime );
            scaleRotateOverTime.push( this.rotateOverTime );
            scaleRotateOverTime.push( 0 );
            scaleRotateOverTime.push( 0 );
        }
        
        // 
    }
    
    // geo
    this.geo = new zen3d.Geometry();
    this.geo.addAttribute( "a_Position", new zen3d.BufferAttribute( Float32Array.from( verts ), 3 ) );
    this.geo.addAttribute( "a_Uv", new zen3d.BufferAttribute( Float32Array.from( uvs ), 2 ) );
    this.geo.addAttribute( "a_Normal", new zen3d.BufferAttribute( Float32Array.from( velocities ), 3 ) );
    this.geo.addAttribute( "a_Color", new zen3d.BufferAttribute( Float32Array.from( lifedata ), 4 ) );
    this.geo.addAttribute( "a_Tangent", new zen3d.BufferAttribute( Float32Array.from( scaleRotateOverTime ), 4 ) );
    this.geo.index = new zen3d.BufferAttribute( Uint16Array.from( indices ), 1 );
    this.geo.computeBoundingBox();
    this.geo.computeBoundingSphere();
    
    // mesh
    this.display = new zen3d.Mesh( this.geo, this.mat );
    
    //console.log( "particle system created: ", options.img );
}

ParticleSystem.prototype.setOpacity = function( value, tween = true )
{
    this.opacity = value;
    if ( !tween ) this.mat.opacity = 0;
}

ParticleSystem.prototype.setStartTime = function( awaitEnd = false )
{
    if ( awaitEnd && this.time - this.mat.uniforms.timing[0] < this.end ) return;
    this.mat.uniforms.timing[0] = this.time;
}

ParticleSystem.prototype.setLoop = function( loop )
{
    this.mat.uniforms.timing[2] = loop;
}

ParticleSystem.prototype.onUpdate = function( deltaTime )
{
    this.time += deltaTime;
    
    this.mat.uniforms.timing[1] = this.time;
    
    if ( this.opacity > 0 )
    {
        this.mat.opacity += deltaTime * 2;
    }
    else
    {
        this.mat.opacity -= deltaTime * 2;
    }
    
    this.mat.opacity = Math.min( this.mat.opacity, 1 );
    this.mat.opacity = Math.max( this.mat.opacity, 0 );
}

// ------------------------------------------------------------------------------------------------------------
// MATERIAL ---------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------

function ParticleMaterial( texUrl )
{   
    var mat = new zen3d.ShaderMaterial
    ({
        vertexShader: this.vert,
        fragmentShader: this.frag,
        uniforms: { timing: [ 0, 0, 0 ] }
    });

    //console.log( texUrl )
    mat.diffuseMap = zen3d.Texture2D.fromSrc( App.loader.extract( texUrl ) );
    mat.diffuseMap.flipY = false;
    
    mat.diffuse = new zen3d.Color3( 0xb40000 );
    mat.transparent = true;
    mat.depthWrite = false;
    mat.depthTest = true;
    mat.blending = zen3d.BLEND_TYPE.CUSTOM;
    mat.blendSrc = zen3d.BLEND_FACTOR.SRC_ALPHA;
    mat.blendDst = zen3d.BLEND_FACTOR.ONE_MINUS_SRC_ALPHA;
    
    return mat;
}


ParticleMaterial.prototype.vert = `

uniform mat4 u_View;
uniform mat4 u_Model;
uniform mat4 u_Projection;
uniform vec3 u_CameraPosition;
uniform float u_Opacity;
uniform vec3 timing;

attribute vec3 a_Position;
attribute vec3 a_Normal;
attribute vec2 a_Uv;
attribute vec4 a_Color;
attribute vec4 a_Tangent;


varying vec2 uv;
varying float alpha;




void main() 
{
    float POS_FLOAT_MIN = 0.000001;
    float POS_FLOAT_MAX = 1000000.0;
    
    // compute current time

    float start = timing.x;
    float lifetime = a_Color.x;
    float timeOffset = a_Color.y;
    float time = timing.y;
    float loop = timing.z;

    time = time - start - timeOffset;

    // loop = = -> infinite
    // loop > 0 -> repeat count

    if ( loop < 1.0 )
    {
        //loop = 3.402823466e+38;
        loop = POS_FLOAT_MAX;
    }

    float end = lifetime * loop;

    if ( time > 0.0 && time < end )
    {
        float currentTime = mod( time, lifetime );
        float fadein = lifetime / ( a_Color.z + POS_FLOAT_MIN );
        float fadeout = lifetime / ( a_Color.w + POS_FLOAT_MIN );
        float remainingTime = lifetime - currentTime;

        // unpack props

        vec3 velocity = a_Normal * currentTime;
        float scaleOverTime = 1.0 + a_Tangent.x * currentTime;
        alpha = clamp( currentTime * fadein, 0.0, 1.0 );
        alpha -= clamp( 1.0 - remainingTime * fadeout, 0.0, 1.0 );
        alpha *= u_Opacity;

        // compute origin

        vec3 origin_WS = vec4( u_Model * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
        vec3 forward = normalize( origin_WS - u_CameraPosition );
        vec3 up = vec3( 0.0, 1.0, 0.0 );
        vec3 right = normalize( cross( forward, up ) );

        float scale = sqrt( u_Model[0][0] * u_Model[0][0] + u_Model[0][1] * u_Model[0][1] + u_Model[0][2] * u_Model[0][2] );
        vec3 pos = a_Position * scale * scaleOverTime;

        origin_WS += pos.x * right;
        origin_WS += pos.y * up;
        origin_WS += pos.z * forward;
        
        forward = normalize( vec3( forward.x, 0, forward.z ) );
        
        origin_WS += velocity.x * right;
        origin_WS += velocity.y * up;
        origin_WS += velocity.z * forward;        

        // output pos_CS

        gl_Position = u_Projection * u_View * vec4( origin_WS, 1.0 );
    }
    else
    {
        gl_Position = vec4( 0.0, 0.0, 0.0, 1.0 );
    }

    // output uvs

    uv = a_Uv;
}
`



ParticleMaterial.prototype.frag = `





uniform vec3 u_AmbientLightColor;
uniform sampler2D diffuseMap;

varying vec2 uv;
varying float alpha;





void main() 
{
    // texture sampling

    vec4 rgba = texture2D( diffuseMap, uv );
    rgba.a *= alpha;

    gl_FragColor = rgba;
}

`

