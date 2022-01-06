/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function LightingDebugger( level )
{
    // props
    this.level = level;
    this.app = this.level.app;
    
    this.shadowStrength = this.level.jsonData.mainLightShadowOpacity;
    this.rimlight = {};
    this.rimPos = new zen3d.Vector3( this.level.jsonData.rimLightPos.x, this.level.jsonData.rimLightPos.y, this.level.jsonData.rimLightPos.z );
    this.rimColor = { color: "#" + this.level.jsonData.rimLightColor.substr( 2 ) };
    this.ambientColor = { color: "#" + this.level.jsonData.ambientColor.substr( 2 ) };
    
    // create gui
    this.gui = new dat.GUI();
    
    this.position = this.gui.addFolder( "Main Position" );
    this.position.open();
    this.position.add( this.app.dir_light.position, "x" ).step( 1 ).onChange( this.onChange.bind( this ) );
    this.position.add( this.app.dir_light.position, "y" ).step( 1 ).onChange( this.onChange.bind( this ) );
    this.position.add( this.app.dir_light.position, "z" ).step( 1 ).onChange( this.onChange.bind( this ) );
    
    this.shadow = this.gui.addFolder( "Main Power & Shadow" );
    this.shadow.open();
    this.shadow.add( this.app.dir_light, "intensity" ).step( 0.1 );
    this.shadow.add( this, "shadowStrength" ).step( 0.1 ).onChange( this.updateShadowStrength.bind( this ) );
    this.shadow.add( this.app.dir_light.shadow, "windowSize" ).step( 1 ).onChange( this.onChange.bind( this ) );
    this.shadow.add( this.app.dir_light.shadow, "cameraNear" ).step( 1 ).onChange( this.onChange.bind( this ) );
    this.shadow.add( this.app.dir_light.shadow, "cameraFar" ).step( 1 ).onChange( this.onChange.bind( this ) );
    
    this.rimlight = this.gui.addFolder( "Rim Light" );
    this.rimlight.open();
    this.rimlight.addColor( this.rimColor, "color" ).onChange( this.updateRimLight.bind( this ) );
    this.rimlight.add( this.rimPos, "x" ).onChange( this.updateRimLight.bind( this ) );
    this.rimlight.add( this.rimPos, "y" ).onChange( this.updateRimLight.bind( this ) );
    this.rimlight.add( this.rimPos, "z" ).onChange( this.updateRimLight.bind( this ) );
    
    this.ambient = this.gui.addFolder( "Ambient" );
    this.ambient.open();
    this.ambient.addColor( this.ambientColor, "color" ).onChange( this.updateAmbientLight.bind( this ) );
    
    // create debug shadowmap

    let debugPlaneGeo = new zen3d.PlaneGeometry( 0.03, 0.03, 1, 1 );
    let debugPlaneMat = new ShadowmapDebugMaterial( 1 );
    let debugPlane = new zen3d.Mesh( debugPlaneGeo, debugPlaneMat );
    debugPlane.receiveShadow = true;
    debugPlane.euler.x = Math.PI * 0.5;
    debugPlane.position.x = -0.02;
    debugPlane.position.y = -0.03;
    debugPlane.position.z = - 0.11;
    this.app.camera.camera.add( debugPlane );
}


LightingDebugger.prototype.onChange = function( event )
{
    this.app.dir_light.lookAt( this.level.dirLightLookAt, this.level.up );
    
    this.app.dir_light.worldMatrixNeedsUpdate = true;
    this.app.dir_light.matrixNeedsUpdate = true;
    this.app.dir_light.updateMatrix();

    this.app.dir_light.shadowPassEnabled = true;
    this.app.renderer.shadowMapPass.render( this.app.renderer.glCore, this.app.scene );
    
    this.level.render();
}

LightingDebugger.prototype.updateShadowStrength = function()
{    
    let i = 0;
    let mat;
    
    for ( i; i < zen3d.materials.length; i++ )
    {
        mat = zen3d.materials[i];
        
        if ( mat.uniforms )
        {
            if ( mat.uniforms.shadowStrength )
            {
                mat.uniforms.shadowStrength = this.shadowStrength + 0.0001;
            }
        }
    }
}

LightingDebugger.prototype.updateRimLight = function()
{
    let color = new zen3d.Color3( "0x" + this.rimColor.color.substr( 1 ) );
    let position = new zen3d.Vector3().copy( this.rimPos ).normalize();
    
    let i = 0;
    let mat;
    
    for ( i; i < zen3d.materials.length; i++ )
    {
        mat = zen3d.materials[i];
        
        if ( mat.uniforms )
        {
            if ( mat.uniforms.rimLightPos )
            {
                mat.uniforms.rimLightPos = [ position.x, position.y, position.z ];
                mat.uniforms.rimLightCol = [ color.r, color.g, color.b ];
            }
        }
    }
}

LightingDebugger.prototype.updateAmbientLight = function()
{
    let color = new zen3d.Color3( "0x" + this.ambientColor.color.substr( 1 ) );
    this.app.ambient.color = color;
}