

function Sprite( width, height, tex )
{    
    // init    
    this.enabled = false;
    this.tex = tex;
    this.tex.flipY = false;
    this.uvScale = [ 1, 1 ]; 
    this.cnt = 0;
    this.width = width;
    this.height = height;

    this.mat = new UIMaterial( tex );
    this.geo = new SpriteGeometry( width, height );
    this.display = new zen3d.Mesh( this.geo, this.mat );
    this.display.frustumCulled = false;
    this.display.renderOrder = 2;
    this.display.autoUpdateMatrix = false;
}

Sprite.prototype.setUV = function( x, y, w, h )
{    
    this.cnt++;
    
    if ( this.uvScale[0] === 1 )
    {        
        if ( this.tex.image )
        {
            this.uvScale = [ 1 / this.tex.image.width, 1 / this.tex.image.height ];
        }
        else
        {
            setTimeout( this.setUV.bind( this ), 100, x, y, w, h );
        }
    }
    
    this.display.material.uniforms.uvTransform[0] = x * this.uvScale[0];
    this.display.material.uniforms.uvTransform[1] = y * this.uvScale[1];
    this.display.material.uniforms.uvTransform[2] = w * this.uvScale[0];
    this.display.material.uniforms.uvTransform[3] = h * this.uvScale[1];
}

Sprite.prototype.onResize = function()
{
    this.mat.uniforms.screenParams[0] = App.stageW;
    this.mat.uniforms.screenParams[1] = App.stageH;
    this.mat.uniforms.screenParams[2] = 1 / App.stageW;
    this.mat.uniforms.screenParams[3] = 1 / App.stageH;
}





function SpriteGeometry( w, h )
{
    let t_verts = [ -0.5 * w, 0.5 * h, 0.0, -0.5 * w, -0.5 * h, 0.0, 0.5 * w, -0.5 * h, 0.0, 0.5 * w, 0.5 * h, 0.0 ];
    let t_uvs = [ 0, 1, 0, 0, 1, 0, 1, 1 ];
    let t_indices = [ 2, 1, 0, 3, 2, 0 ];
    
    let geo = new zen3d.Geometry();
    geo.addAttribute( "a_Position", new zen3d.BufferAttribute( new Float32Array( t_verts ), 3 ) );
    geo.addAttribute( "a_Uv", new zen3d.BufferAttribute( new Float32Array( t_uvs ), 2 ) );
    geo.index = new zen3d.BufferAttribute( new Uint16Array( t_indices ), 1 );
    
    return geo;
}