

function AssetLoader()
{
    // props
    this.eventCallbacks =
    {
        'ready' : []
    };
    this.assets = {};
}

AssetLoader.prototype.load = function( baseUrl, baseName, animations )
{
    // create material
    let material = new FastPbrMaterial( baseName, baseUrl + baseName, App.level.levelparser.rimlight, "front", App.level.envMap );
    
    // cache animations
    this.animations = animations;
    
    // load gltf
    this.loader = new zen3d.GLTFLoader();
    this.loader.load( App.loader.extract( baseUrl + baseName + ".glb" ), this.onParsingComplete.bind( this ), undefined, undefined, [ material ] );
}

AssetLoader.prototype.onParsingComplete = function( gltf )
{
    // asset
    let asset = new Asset();

    // display
    asset.display = gltf.scene.children[0];
    asset.name = asset.display.name;
    asset.animations = this.animations;
    asset.all = AppUtils.getAllObjects( asset.display, "", "" );
    
    // animation
    if ( gltf.animations.length > 0 )
    {
        // prepare animations
        for ( var a in asset.animations )
        {
            asset.animations[a].len = asset.animations[a].end - asset.animations[a].start;
        }
        
        // create timeline
        asset.timeline = gltf.animations[0];
        asset.timeline.name = "timeline";
        
        // create animMixer
        asset.animationMixer = new zen3d.AnimationMixer();
        asset.animationMixer.add( asset.timeline );
        
        // collect animated objects
        asset.animatedObjects = [];
        
        var index = 0;
        var t = 0;
        
        for ( t = 0; t < asset.timeline.tracks.length; t++ )
        {
            index = asset.animatedObjects.indexOf( asset.timeline.tracks[t].target );
            
            if ( index === -1 )
            {
                asset.timeline.tracks[t].childIndex = asset.animatedObjects.length;
                asset.animatedObjects.push( asset.timeline.tracks[t].target );
            }
            else
            {
                asset.timeline.tracks[t].childIndex = index;
            }
        }
        
        // check for skeleton
        let skins = AppUtils.getAllObjects( asset.display, "", "skinned_mesh" );
        if ( skins.length > 0 )
        {
            asset.skins = skins;
            
            /*
            for ( t = 0; t < skins.length; t++ )
            {
                skins[t].bindMode = "detached";
            }*/
        }
    }
    
    // add to library
    this.assets[asset.name] = asset;
    
    // ready
    for ( var i = 0; i < this.eventCallbacks["ready"].length; i++ )
    {
        this.eventCallbacks["ready"][i]();
    }
}

AssetLoader.prototype.addEventListener = function( type, callback )
{
    if ( !this.eventCallbacks.hasOwnProperty( type ) )
    {
        console.log( "AssetLoader has no " + type + " event" );
        return;
    }
    
    this.eventCallbacks[ type ].push( callback );
}

AssetLoader.prototype.instantiate = function( id )
{
    if ( !this.assets.hasOwnProperty( id ) )
    {
        console.log( "Asset " +  id + " does not exist" );
        return;
    }
    
    // clone    
    let asset = this.assets[id];
    
    let clone = new Asset();
    clone.name = asset.name;
    
    // clone display tree
    clone.display = asset.display.clone();
    clone.all = AppUtils.getAllObjects( clone.display, "", "" );
    
    // clone animation
    if ( asset.animationMixer )
    {        
        // clone animatedObjects
        clone.animatedObjects = [];
        
        let a = 0;
        let i = 0;

        for ( a = 0; a < asset.animatedObjects.length; a++ )
        {
            for ( i = 0; i < clone.all.length; i++ )
            {
                if ( asset.animatedObjects[a].name === clone.all[i].name && asset.animatedObjects[a].type === clone.all[i].type )
                {
                    clone.animatedObjects.push( clone.all[i] );
                }
            }
        }
        
        // check for skeleton
        if ( asset.skins )
        {
            clone.skins = AppUtils.getAllObjects( clone.display, "", "skinned_mesh" );
            
            let skeleton;
            let clonedBone;
            let clonedBones = [];

            for ( a = 0; a < asset.skins.length; a++ )
            {
                skeleton = asset.skins[a].skeleton;
                clonedBones = [];

                for ( i = 0; i < skeleton.bones.length; i++ )
                {
                    clonedBone = AppUtils.getAllObjects( clone.display, skeleton.bones[i].name, "bone" )[0];
                    clonedBone.offsetMatrix.copy( skeleton.bones[i].offsetMatrix );
                    clonedBones.push( clonedBone );
                }

                clone.skins[a].skeleton = new zen3d.Skeleton( clonedBones );
            }
        }
        
        // clone animations
    
        clone.animations = {};

        for ( i in asset.animations )
        {
            clone.animations[i] = 
            {
                start: asset.animations[i].start,
                end: asset.animations[i].end,
                len: asset.animations[i].len,
                loop: asset.animations[i].loop
            }
        }

        // clone timeline
        clone.timeline = new zen3d.KeyframeClip();
        clone.timeline.name = asset.timeline.name;
        clone.timeline.endFrame = asset.timeline.endFrame;

        let t = 0;
        let track;
        let clonedTrack;

        for ( t = 0; t < asset.timeline.tracks.length; t++ )
        {
            track = asset.timeline.tracks[t];
            
            switch( track.propertyPath )
            {
                case "position":
                    clonedTrack = new zen3d.VectorKeyframeTrack( clone.animatedObjects[track.childIndex], "position", Float32Array.from( track.times ), Float32Array.from( track.values ), track.interpolant );
                break;

                case "quaternion":
                    clonedTrack = new zen3d.QuaternionKeyframeTrack( clone.animatedObjects[track.childIndex], "quaternion", Float32Array.from( track.times ), Float32Array.from( track.values ), track.interpolant );
                break;

                case "scale":
                    clonedTrack = new zen3d.VectorKeyframeTrack( clone.animatedObjects[track.childIndex], "scale", Float32Array.from( track.times ), Float32Array.from( track.values ), track.interpolant );
                break;
            }

            clone.timeline.tracks.push( clonedTrack );
        }
        
        // clone animationMixer
        clone.animationMixer = new zen3d.AnimationMixer();
        clone.animationMixer.add( clone.timeline );
    }
    
    return clone;
}

AssetLoader.prototype.destroy = function()
{
    // templates
    for ( let a in this.assets )
    {
        AppUtils.destroyScene( this.assets[a] );
    }
}






function Asset()
{
    // props
    this.name;
    this.display;
    this.skins;
    this.animatedObjects;
    this.timeline;
    this.animations;
    this.currentAnim;
}

Asset.prototype.resetSkeleton = function()
{
    for ( let i = 0; i < this.skins.length; i++ )
    {
        //this.skins[i].skeleton.pose();
        //this.skins[i].skeleton.updateBones();
    }
}

Asset.prototype.gotoAndPlay = function( id, offset = 0 )
{
    this.currentAnim = id;

    this.timeline.frame = this.animations[id].start;
    this.timeline.startFrame = this.animations[id].start;
    this.timeline.endFrame = this.animations[id].end;
    this.timeline.loop = this.animations[id].loop;
    this.animationMixer.play( "timeline", this.animations[id].start + offset );
}

Asset.prototype.onUpdate = function( deltaTime )
{
    this.animationMixer.fastUpdate( deltaTime );
}


