


function AdvancedParticleSystem( data )
{
    // props
    this.time = 0;
    
    // quad template data
    let quad_verts = [ -0.5, 0.5, 0.0, -0.5, -0.5, 0.0, 0.5, -0.5, 0.0, 0.5, 0.5, 0.0 ];
    let quad_verts_xy = [ 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5 ];
    let quad_uvs = [ 0, 1, 1, 1, 1, 0, 0, 0 ];
    let quad_indices = [ 3, 2, 0, 2, 1, 0 ];
    
    // prepare input data
    
    let i = 0;
    
    data.lifetime.delta = data.lifetime.max - data.lifetime.min;
    data.offset.delta = data.offset.max - data.offset.min;
    data.velocity.delta = data.velocity.max.clone().subtract( data.velocity.min );
    data.scale.birth.delta = data.scale.birth.max - data.scale.birth.min;
    data.scale.death.delta = data.scale.death.max - data.scale.death.min;
    data.rotation.delta = data.rotation.max - data.rotation.min;
    data.wiggle.frequency.delta = data.wiggle.frequency.max - data.wiggle.frequency.min;
    data.alpha.delta = data.alpha.max - data.alpha.min;
    
    for( i; i < 8; i += 2 )
    {
        quad_uvs[i] = quad_uvs[i] * data.uvTransform.scale.x + data.uvTransform.offset.x;
        quad_uvs[i+1] = quad_uvs[i+1] * data.uvTransform.scale.y + data.uvTransform.offset.y;
    }
    
    // create particle data
    
    let verts = [];                 // positon offset
    let uvs = [];                   // uvs
    let uvs2 = [];                  // billboard x,y
    let indices = [];               // indices
    let normals = [];               // velocities
    let tangents = [];              // changes over life: death scale, death alpha, rotation
    let colors = [];                // lifetime data: lifetime, lifetime offset, birth alpha
    
    let emitter = new zen3d.Vector3();
    let scale = 1;
    let equalizedOffset = data.lifetime.delta / data.count;

    let v = 0;
    
    for ( i = 0; i < data.count; i++ )
    {
        // offset

        emitter.x = data.emitter.size.x * ( Math.random() * 2 - 1 );
        emitter.y = data.emitter.size.y * ( Math.random() * 2 - 1 );
        emitter.z = data.emitter.size.z * ( Math.random() * 2 - 1 );
        
        for ( v = 0; v < 4; v++ )
        {            
            verts.push( emitter.x );
            verts.push( emitter.y );
            verts.push( emitter.z );
        }
        
        // uvs
        
        uvs = uvs.concat( quad_uvs );
        
        // billboard x,y

        scale = data.scale.birth.min + Math.random() * data.scale.birth.delta;
        
        for ( v = 0; v < 8; v += 2 )
        {            
            uvs2.push( quad_verts_xy[ v ] * scale );
            uvs2.push( quad_verts_xy[ v+1 ] * scale );
        }
        
        // indices
        
        for ( v = 0; v < 6; v++ )
        {      
            indices.push( quad_indices[ v ] + i * 4 );
        }
        
        // lifetime data   

        let lifetime = data.lifetime.min + Math.random() * data.lifetime.delta;
        let offset = data.offset.min + Math.random() * data.offset.delta;
        let randomSeed = Math.random() * 100;
        // equalizedOffset * i

        for ( v = 0; v < 4; v++ )
        {
            colors.push( lifetime );
            colors.push( offset * i );
            colors.push( randomSeed );
            colors.push( 0 );
        };

        // velocities
        
        let velocity = new zen3d.Vector3();
        velocity.x = data.velocity.min.x + Math.random() * data.velocity.delta.x;
        velocity.y = data.velocity.min.y + Math.random() * data.velocity.delta.y;
        velocity.z = data.velocity.min.z + Math.random() * data.velocity.delta.z;

        for ( v = 0; v < 4; v++ )
        {
            normals.push( -velocity.x );
            normals.push( velocity.y );
            normals.push( velocity.z );
        };
        
        // changes over life
        
        let changes = [];
        changes[0] = data.scale.death.min + Math.random() * data.scale.death.delta;
        changes[1] = 0;
        changes[2] = data.rotation.min + Math.random() * data.rotation.delta;
        changes[3] = data.wiggle.frequency.min + Math.random() * data.wiggle.frequency.delta;
        
        for ( v = 0; v < 4; v++ )
        {
            tangents.push( changes[0] );
            tangents.push( 0 );
            tangents.push( changes[2] );
            tangents.push( changes[3] );
        };
    }

    // create geo
    this.geo = new zen3d.Geometry();
    this.geo.addAttribute( "a_Position", new zen3d.BufferAttribute( Float32Array.from( verts ), 3 ) );
    this.geo.addAttribute( "a_Uv", new zen3d.BufferAttribute( Float32Array.from( uvs ), 2 ) );
    this.geo.addAttribute( "a_Uv2", new zen3d.BufferAttribute( Float32Array.from( uvs2 ), 2 ) );
    this.geo.addAttribute( "a_Normal", new zen3d.BufferAttribute( Float32Array.from( normals ), 3 ) );
    this.geo.addAttribute( "a_Color", new zen3d.BufferAttribute( Float32Array.from( colors ), 4 ) );
    this.geo.addAttribute( "a_Tangent", new zen3d.BufferAttribute( Float32Array.from( tangents ), 4 ) );

    this.geo.index = new zen3d.BufferAttribute( Uint16Array.from( indices ), 1 );
    this.geo.computeBoundingBox();
    this.geo.computeBoundingSphere();

    // create material
    let materialData =
    {
        diffuseMap: zen3d.Texture2D.fromSrc( App.loader.extract( data.texUrl ) ),
        gravity: data.gravity,
        repeat: data.repeat,
        alpha: data.alpha,
        wiggle: data.wiggle,
        colorOverLife: data.colorOverLife,
        alphaOverLife: data.alphaOverLife
    };
    this.mat = new AdvancedParticleMaterial( materialData );

    // create mesh
    this.display = new zen3d.Mesh( this.geo, this.mat );
}

AdvancedParticleSystem.prototype.onUpdate = function( deltaTime )
{
    this.time += deltaTime;
    
    // update uniforms
    this.mat.uniforms.timing[0] = this.time;
}

AdvancedParticleSystem.prototype.setStartTime = function( time = 0 )
{
    this.time = time;
}

function AdvancedParticleMaterial( data )
{
    let mat = new zen3d.ShaderMaterial
    ({
        vertexShader: this.vert,
        fragmentShader: this.frag,
        uniforms: 
        { 
            timing: [ 0, 0, data.repeat ],
            gravity: [ -data.gravity.x, data.gravity.y, data.gravity.z ],
            wiggleAmp: [ data.wiggle.amplitude.x, data.wiggle.amplitude.y, data.wiggle.amplitude.z ],
            colorOverLife:
            [ 
                data.colorOverLife[0].time, data.colorOverLife[0].color.r, data.colorOverLife[0].color.g, data.colorOverLife[0].color.b,
                data.colorOverLife[1].time, data.colorOverLife[1].color.r, data.colorOverLife[1].color.g, data.colorOverLife[1].color.b,
                data.colorOverLife[2].time, data.colorOverLife[2].color.r, data.colorOverLife[2].color.g, data.colorOverLife[2].color.b,
                data.colorOverLife[3].time, data.colorOverLife[3].color.r, data.colorOverLife[3].color.g, data.colorOverLife[3].color.b,
            ],
            alphaOverLife:
            [ 
                data.alphaOverLife[0].time, data.alphaOverLife[0].alpha,
                data.alphaOverLife[1].time, data.alphaOverLife[1].alpha,
                data.alphaOverLife[2].time, data.alphaOverLife[2].alpha,
                data.alphaOverLife[3].time, data.alphaOverLife[3].alpha,
                data.alpha.min + Math.random() * data.alpha.delta
            ]
        }
    });

    mat.diffuseMap = data.diffuseMap;
    mat.diffuseMap.flipY = true;
    mat.diffuseMap.wrapS = mat.diffuseMap.wrapT = zen3d.WEBGL_TEXTURE_WRAP.REPEAT;
    mat.transparent = true;
    
    //mat.depthTest = false;
    mat.depthWrite = false;
    mat.blendMode = zen3d.BLEND_TYPE.NORMAL;
    
    return mat;
}

AdvancedParticleMaterial.prototype.vert = `

uniform mat4 u_View;
uniform mat4 u_Model;
uniform mat4 u_Projection;
uniform vec3 u_CameraPosition;
uniform float u_Opacity;

uniform vec3 timing;
uniform vec3 gravity;
uniform vec3 wiggleAmp;
uniform mat4 colorOverLife;
uniform mat3 alphaOverLife;

attribute vec3 a_Position;
attribute vec3 a_Normal;
attribute vec4 a_Tangent;
attribute vec4 a_Color;
attribute vec2 a_Uv;
attribute vec2 a_Uv2;


varying vec2 uv;
varying vec4 color;


const float POS_FLOAT_MIN = 0.000001;
const float POS_FLOAT_MAX = 1000000.0;

float hash11(float p)
{
    p = fract(p * .1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash12(vec2 p)
{
    vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float hash13(vec3 p3)
{
    p3  = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}



void main() 
{
    float lifetime_total = a_Color[0];
    float starttime = a_Color[1];
    float startAlpha = a_Color[2];

    float start = timing.y;
    float loop = timing.z;
    float elapsed = max( timing.x - starttime, 0.0 );

    float wiggleFreq = a_Tangent.w;
    float random = a_Color.b;

    // origin
    vec3 origin_WS = vec3( 0.0 );
    vec3 pos_WS = vec3( 0.0 );

    if ( elapsed > 0.0 && elapsed < lifetime_total * loop )
    {
        // compute loop timing
        elapsed = mod( elapsed, lifetime_total );
        float lifetime_current = elapsed / lifetime_total;

        // origin_WS
        origin_WS = ( u_Model * vec4( a_Position, 1.0 ) ).xyz;

        // pos_MS
        vec2 pos_MS = vec2( a_Uv2.x, a_Uv2.y );

        // compute scaleOverLife
        float scale = mix( 1.0, a_Tangent[0], lifetime_current );
        pos_MS *= scale;

        // rotation
        float angle = a_Tangent.z * elapsed;
        float s = sin( angle );
	float c = cos( angle );
	mat2 rotMat = mat2( c, -s, s, c );
        pos_MS *= rotMat;

        // velocity
        origin_WS += a_Normal * elapsed;

        // gravity
        origin_WS += gravity * elapsed * elapsed;

        // wiggle
        float trigX = sin( ( elapsed + random ) * wiggleFreq );
        float trigY = cos( ( elapsed + hash11( random ) ) * wiggleFreq );
        float trigZ = sin( ( elapsed + hash11( random * 2.0 ) ) * wiggleFreq );
        origin_WS.x += wiggleAmp.x * trigX * scale;
        origin_WS.y += wiggleAmp.y * trigY * scale;
        origin_WS.z += wiggleAmp.z * trigZ * scale;

        // colorOverLife

        float delta = 0.0;
        float t = 0.0;
        vec3 c1 = vec3( 0.0 );
        vec3 tempColor = vec3( colorOverLife[0][1], colorOverLife[0][2], colorOverLife[0][3] );
        float tempAlpha = alphaOverLife[0][1];
        vec4 alphaTimings = vec4( alphaOverLife[0][0], alphaOverLife[0][2], alphaOverLife[1][1], alphaOverLife[2][0] );
        vec4 alphaValues = vec4( alphaOverLife[0][1], alphaOverLife[1][0], alphaOverLife[1][2], alphaOverLife[2][1] );

        for ( int i = 0; i < 3; i ++ )
        {
            // colorOverLife

            delta = colorOverLife[i+1][0] - colorOverLife[i][0] + 0.0001;
            t = max( lifetime_current - colorOverLife[i][0], 0.0 );
            t = min( t / delta, 1.0 );

            c1.r = colorOverLife[i+1][1];
            c1.g = colorOverLife[i+1][2];
            c1.b = colorOverLife[i+1][3];
            
            tempColor = mix( tempColor, c1, t );

            // alphaOverLife

            delta = alphaTimings[i+1] - alphaTimings[i] + 0.0001;
            t = max( lifetime_current - alphaTimings[i], 0.0 );
            t = min( t / delta, 1.0 );
            
            tempAlpha = mix( tempAlpha, alphaValues[i+1], t );
        }

        color.rgb = tempColor;
        color.a = tempAlpha * alphaOverLife[2][2];

        // to world space
        //pos_WS = origin_WS + ( u_Model * vec4( pos_MS, 0.0 ) ).xyz;

        // world-aligned billboard
        vec3 forward = normalize( u_CameraPosition - origin_WS );
        vec3 up = vec3( 0.0, 1.0, 0.0 );
        vec3 right = cross( forward, up );
        pos_WS = origin_WS + right * pos_MS.x + up * pos_MS.y;
    }

    color.a *= u_Opacity;

    // output uvs
    uv = a_Uv;

    // output pos_CS
    gl_Position = u_Projection * u_View * vec4( pos_WS, 1.0 );
}
`



AdvancedParticleMaterial.prototype.frag = `

uniform vec3 u_AmbientLightColor;
uniform sampler2D diffuseMap;

varying vec2 uv;
varying vec4 color;





void main() 
{
    // texture sampling
    vec4 rgba = texture2D( diffuseMap, uv );
    rgba *= color;

    // output final color
    gl_FragColor = rgba;
}

`

