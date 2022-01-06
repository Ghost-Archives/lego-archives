

function Camera( level )
{
    // super    
    zen3d.Object3D.call( this );
    
    // container
    this.container = new zen3d.Object3D();
    this.add( this.container );
    
    // const
    this.level = level;
    this.D2R = 1 / 180 * Math.PI;
    this.camera = new zen3d.Camera();
    this.container.add( this.camera );
    
    // props
    this._FOV = 45; //45
    this.FOV = this._FOV * this.D2R;
    this._frustum = { min: 0.2, max: 100 };

    this.posCache = new zen3d.Vector3();
    this.quatCache = new zen3d.Quaternion();

    this.shakeTime = 0;
    this.shakeStrength = 0;
}

Camera.prototype = Object.create( zen3d.Object3D.prototype );
Camera.prototype.constructor = Camera;

Camera.prototype.setFOV = function( newFOV, time = 1 )
{
    if ( this._FOV === newFOV ) return;
    
    this._FOV = newFOV;
    gsap.to( this, time, { ease: Quad.easeInOut, FOV: newFOV  * this.D2R, onUpdate: this.updatePerspective.bind( this ) } );
}

Camera.prototype.setFrustum = function( min, max )
{
    this._frustum.min = min;
    this._frustum.max = max;
    this.updatePerspective();
}

Camera.prototype.updatePerspective = function()
{
    this.camera.setPerspective( this.FOV, App.aspectRatio, this._frustum.min, this._frustum.max );
}

Camera.prototype.setBlock = function( blockData, tween = true )
{
    this.posCache.copy( blockData.position );
    this.quatCache.copy( blockData.quaternion );
    
    if ( this.level.state === this.level.STATE.VEHICLE )
    {
        this.posCache.y *= 1.1;
        this.posCache.z *= 1.1;
    }
    
    if ( tween )
    {
        gsap.to( this.position, 1, { ease: Sine.easeInOut, y: this.posCache.y, z: this.posCache.z } );
        gsap.to( this.quaternion, 1, { ease: Sine.easeInOut, x: this.quatCache.x, y: this.quatCache.y, z: this.quatCache.z, w: this.quatCache.w } );
    }
    else
    {
        this.position.copy( this.posCache );
        this.quaternion.copy( this.quatCache );
    }
}

Camera.prototype.shake = function( time )
{
    this.shakeTime = time;
}

Camera.prototype.killAllTweens = function()
{
    gsap.killTweensOf( this.position );
    gsap.killTweensOf( this.euler );
    gsap.killTweensOf( this.quaternion );
    
    // reset to cached values?
}