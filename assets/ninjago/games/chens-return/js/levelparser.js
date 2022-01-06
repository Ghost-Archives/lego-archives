


function LevelParser()
{    
    // init    
    this.debug = false;
    this.templates = [];
    this.blocks = [];
    this.animations = {};
    this.specials = {};
    this.partHasGoldenBrick = [];
    
    this.buildTime = Date.now();

    // lego colors    
    this.standardItemColors =
    [
        { name: "Bright Red",           r: 180, g: 0, b: 0, a: 255 },
        { name: "Bright Yellow",        r: 250, g: 200, b: 10, a: 255 },
        { name: "Bright Green",         r: 88, g: 171, b: 65, a: 255 },
        { name: "Bright Blue",          r: 30, g: 90, b: 168, a: 255 },
        { name: "Bright Orange",        r: 214, g: 121, b: 35, a: 255 }
    ];
}

LevelParser.prototype.init = function( json )
{
    // store json
    this.json = json;
    
    // prepare rimlight
    this.rimlight = {};
    this.rimlight.position = new zen3d.Vector3( this.json.rimLightPos.x, this.json.rimLightPos.y, this.json.rimLightPos.z ).normalize();
    this.rimlight.color = new zen3d.Color3( this.json.rimLightColor );
    
    // prepare asset loader
    this.assetLoaderAssets = [];
    
    if ( this.json.id === 0 )
    {
        this.assetLoaderAssets.push
        ({
            name: "snake",
            baseUrl: App.baseUrl + "/anims/",
            animations:
            {
                IDLE:
                { 
                    start:  1 / 30,
                    end:    20 / 30,
                    loop:   true
                },
                ATTACK: 
                { 
                    start:  21 / 30,
                    end:    51 / 30,
                    loop:   false
                }
            }
        });
    }
    else if ( this.json.id === 1 )
    {
        this.assetLoaderAssets.push
        ({
            name: "stone_warrior",
            baseUrl: App.baseUrl + "/anims/",
            animations:
            {
                RUN: 
                { 
                    start:  1 / 30,
                    end:    20 / 30,
                    loop:   true
                },
                ATTACK_SWORD: 
                { 
                    start:  25 / 30,
                    end:    60 / 30,
                    loop:   false
                },
                IDLE_1:
                { 
                    start:  65 / 30,
                    end:    135 / 30,
                    loop:   true
                }
            }
        });
    }
    else if ( this.json.id === 2 )
    {
        this.assetLoaderAssets.push
        ({
            name: "hypnobrai",
            baseUrl: App.baseUrl + "/anims/",
            animations:
            {
                IDLE_1:
                { 
                    start:  200 / 30,
                    end:    235 / 30,
                    loop:   false
                },
                STRAFE_L:
                { 
                    start:  25 / 30,
                    end:    36 / 30,
                    loop:   false
                },
                STRAFE_R:
                { 
                    start:  40 / 30,
                    end:    51 / 30,
                    loop:   false
                },
                PREPARE_ATTACK:
                { 
                    start:  125 / 30,
                    end:    143 / 30,
                    loop:   false
                },
                SHOOT:
                { 
                    start:  145 / 30,
                    end:    158 / 30,
                    loop:   false
                },
                DIE_1:
                { 
                    start:  160 / 30,
                    end:    195 / 30,
                    loop:   false
                }                
            }
        });
    }
    
    this.assetLoader = new AssetLoader();
    this.assetLoader.addEventListener( "ready", this.onAssetComplete.bind( this ) );
    this.onAssetComplete();
}

LevelParser.prototype.onAssetComplete = function()
{
    if ( this.assetLoaderAssets.length > 0 )
    {
        let asset = this.assetLoaderAssets.pop();
        this.assetLoader.load( asset.baseUrl, asset.name, asset.animations );
    }
    else
    {
        this.parse();
    }
}

LevelParser.prototype.parse = function()
{
    // store data
    this.debug = this.json.debug;
    
    let i = 0;

    // create custom textures
    if ( this.json.textures )
    {
        this.textures = {};
        let tex;
        
        for ( i = 0; i < this.json.textures.length; i++ )
        {
            switch( this.json.textures[i]. type )
            {
                case "Cubemap":
                    
                    let file = this.json.baseUrl + "skybox/" + this.json.textures[i].name;
                    
                    tex = zen3d.TextureCube.fromSrc
                    ([    
                        App.loader.extract( file + '_0000.jpg' ),
                        App.loader.extract( file + '_0001.jpg' ),
                        App.loader.extract( file + '_0002.jpg' ),
                        App.loader.extract( file + '_0003.jpg' ),
                        App.loader.extract( file + '_0004.jpg' ),
                        App.loader.extract( file + '_0005.jpg' )
                    ]);
                    tex.name = this.json.textures[i].name;
                    
                    this.textures[ this.json.textures[i].name ] = tex;
                    
                break;
            }
        }
    }
    
    // create custom materials    
    this.materials = [];
    let mat;
    
    let skybox = new UnlitMaterial( "skybox", this.json.baseUrl + this.json.skyboxUrl + ".png" );
    skybox.diffuseMap.wrapS = skybox.diffuseMap.wrapT = zen3d.WEBGL_TEXTURE_WRAP.REPEAT;
    this.materials.push( skybox );
    
    let collider = new zen3d.BasicMaterial();
    //collider.transparent = true;
    //collider.opacity = 1;
    collider.diffuse = new zen3d.Color3( 0xFF0000 );
    collider.acceptLight = true;
    this.materials.push( collider );
    
    let sensor = new zen3d.BasicMaterial();
    //sensor.transparent = true;
    //sensor.opacity = 1;
    sensor.diffuse = new zen3d.Color3( 0x0099FF );
    collider.acceptLight = true;
    this.materials.push( sensor );

    for ( i = 0; i < this.json.materials.length; i++ )
    {        
        let normalScale = 1;
        
        switch( this.json.materials[i].type )
        {
            case "LandscapeMaterial":
                mat = new LandscapeMaterial( this.json.materials[i].name, this.json.baseUrl + this.json.materials[i].file, this.rimlight, this.json.materials[i].side, App.level.envMap, App.level.jsonData.aoIntesity );
            break;
            
            case "TransparentMaterial":
                mat = new TransparentMaterial( this.json.materials[i].name, this.json.baseUrl + this.json.materials[i].file, this.rimlight, this.json.materials[i].side, App.level.envMap );
            break;
            
            case "FastPbrMaterial":
                mat = new FastPbrMaterial( this.json.materials[i].name, this.json.baseUrl + this.json.materials[i].file, this.rimlight, this.json.materials[i].side, App.level.envMap );
            break;
            
            case "UnlitMaterial":
                mat = new UnlitMaterial( this.json.materials[i].name, this.json.baseUrl + this.json.materials[i].file + "_aa.png" );
                if ( this.json.materials[i].transparent ) mat.transparent = true;
            break;
            
            case "WaterfallMaterial":
                mat = new WaterfallMaterial( this.json.materials[i].name, this.json.baseUrl + this.json.materials[i].file, this.rimlight, this.json.materials[i].side, App.level.envMap );
            break;
            
            case "DeNormMaterial":
                normalScale = this.json.materials[i].normalScale ? this.json.materials[i].normalScale : 1;
                //let envMap = App.level.envMap;                
                //if ( this.json.materials[i].envMap ) envMap = this.textures[this.json.materials[i].envMap];
                
                mat = new DeNormMaterial( this.json.materials[i].name, this.json.baseUrl + this.json.materials[i].file, App.level.envMap, normalScale, this.json.materials[i].transparent, this.json.materials[i].side );
            break;
            
            case "UnlitEnvMaterial":
                normalScale = this.json.materials[i].normalScale ? this.json.materials[i].normalScale : 1;
                //let envMap = App.level.envMap;                
                //if ( this.json.materials[i].envMap ) envMap = this.textures[this.json.materials[i].envMap];
                
                mat = new UnlitEnvMaterial( this.json.materials[i].name, this.json.baseUrl + this.json.materials[i].file, App.level.envMap, normalScale );
            break;
        }
        
        if ( this.json.materials[i].horizon )
        {
            mat.uniforms.horizon = this.json.materials[i].horizon;
        }
        
        this.materials.push( mat );
    }

    // load gltf    
    var data = App.loader.extract( this.json.baseUrl + "map.glb" );
    
    App.onLoaderProgress( { progress: 0.1 } );
    
    this.loader = new zen3d.GLTFLoader();
    this.loader.load( data, this.onParsingComplete.bind( this ), undefined, undefined, this.materials );
}

LevelParser.prototype.onParsingComplete = function( gltf )
{
    App.onLoaderProgress( { progress: 0.5 } );

    let tmp;
    let i;
    
    // SCENE CLEANUP --------------------------------------------------------------
    // 
    // delete "Materials"
    tmp = AppUtils.getAllObjects( gltf.scene.children, "Materials", "", false )[0];
    gltf.scene.remove( tmp );
    
    //console.log( gltf.scene )
    
    // PARSE CAMERA ANIMATION --------------------------------------------------------------
    // just retargeting, no cloning!
    
    let objects = AppUtils.getAllObjects( gltf.scene.children, "CAM_Anim", "", false );
    this.cameraAnimationData = ECS.extractKeyframeClip( gltf, objects, 0 );
    this.cameraAnimationData.name = "CAM_Anim";
    
    // PARSE & STORE ANIMATIONS --------------------------------------------------------------

    objects = gltf.scene.getObjectByName( "ANIMS" );
    
    if ( objects )
    {
        objects = AppUtils.getAllObjects( objects, "", "" );
        let obj;
        let animationIds = [ "ANIM_Falling_Rocks", "ANIM_Bridge_Falling", "ANIM_Temple_Floor_Collapse", "ANIM_Falling_Ice", "ANIM_Lab_Door" ];
        let a;
        let allChildren;
        let animation;

        for ( i = 0; i < objects.length; i++ )
        {
            obj = objects[i];

            for ( a = 0; a < animationIds.length; a++ )
            {        
                if ( obj.name.indexOf( animationIds[a] ) > -1 )
                {
                    if ( !this.animations.hasOwnProperty( animationIds[a] ) )
                    {
                        allChildren = AppUtils.getAllObjects( obj.children, "", "" );
                        animation = ECS.extractKeyframeClip( gltf, allChildren );
                        animation.name = "anim";
                        this.animations[ animationIds[a] ] = animation;
                    }
                }
            }
        }
    
        // PARSE & STORE SPECIALS --------------------------------------------------------------

        // StoneCollision
        obj = AppUtils.getAllObjects( gltf.scene.children, "ANIM_StoneCollision", "", true )[0];
        if ( obj )
        {
            let keyframeClip = ECS.extractKeyframeClip( gltf, obj.children );
            keyframeClip.name = "anim";
            this.specials[ "StoneCollision" ] = new ECS.StoneCollision( obj, keyframeClip );
            this.specials[ "StoneCollision" ].display.visible = false;
        }

        // CactusCollision
        obj = AppUtils.getAllObjects( gltf.scene.children, "ANIM_CactusCollision", "", true )[0];
        if ( obj )
        {
            keyframeClip = ECS.extractKeyframeClip( gltf, obj.children );
            keyframeClip.name = "anim";
            this.specials[ "CactusCollision" ] = new ECS.StoneCollision( obj, keyframeClip );
            this.specials[ "CactusCollision" ].display.visible = false;
        }
        
        // IceCollision
        obj = AppUtils.getAllObjects( gltf.scene.children, "ANIM_Ice_Collision", "", true )[0];
        if ( obj )
        {
            keyframeClip = ECS.extractKeyframeClip( gltf, obj.children );
            keyframeClip.name = "anim";
            this.specials[ "IceCollision" ] = new ECS.StoneCollision( obj, keyframeClip );
            this.specials[ "IceCollision" ].display.visible = false;
        }
        
        // Boxes
        obj = AppUtils.getAllObjects( gltf.scene.children, "ANIM_Boxes", "", true )[0];
        if ( obj )
        {
            keyframeClip = ECS.extractKeyframeClip( gltf, obj.children );
            keyframeClip.name = "anim";
            this.specials[ "BoxesCollision" ] = new ECS.StoneCollision( obj, keyframeClip );
            this.specials[ "BoxesCollision" ].display.visible = false;
        }
        
        // Chen_Death
        obj = AppUtils.getAllObjects( gltf.scene.children, "ANIM_Chen_Death", "", true )[0];
        if ( obj )
        {
            keyframeClip = ECS.extractKeyframeClip( gltf, obj.children );
            keyframeClip.name = "anim";
            keyframeClip.loop = false;
            this.specials[ "ChenDeath" ] = new ECS.StoneCollision( obj, keyframeClip );
            this.specials[ "ChenDeath" ].display.visible = false;
        }
    }
    
    // Set Vertex Colors
    
    objects = AppUtils.getAllObjects( gltf.scene.children, "", "" );
    
    for ( i = 0; i < objects.length; i++ )
    {
        obj = objects[i];
        
        if ( obj.name.indexOf( "m6141_LOWP" ) > - 1 )
        {
            AppUtils.setVertexColors( obj, AppUtils.getRandomArrayElement( this.standardItemColors ) );
        }
        else if ( obj.name.indexOf( "ITEM_Hourglass" ) > - 1 )
        {
            AppUtils.setVertexColors( obj.children[0], { r: 255, g: 255, b: 255, a: 255 } );
        }
        else if ( obj.name.indexOf( "Firepit_Flame" ) > - 1 )
        {
            AppUtils.setVertexColors( obj, { r: 255, g: 255, b: 255, a: 255 } );
            obj.material.blendSrc = zen3d.BLEND_FACTOR.ONE;
            obj.material.blendDst = zen3d.BLEND_FACTOR.ONE;
        }
    }
    
    // skybox
    
    App.level.skybox = AppUtils.getAllObjects( gltf.scene.children, "Skybox", "mesh", false )[0];
    App.level.skybox.frustumCulled = false;
    App.level.skybox.castShadow = App.level.skybox.receiveShadow = false;
    App.level.skybox.scale.set( 30, 30, 30 );
    App.scene.add( App.level.skybox );
    
    // PARSE BUILDING BLOCKS --------------------------------------------------------------
    
    let parts = AppUtils.getAllObjects( gltf.scene.children, "PART_", "", false );
    let p;
    let block;
    
    for ( p = 0; p < parts.length; p++ )
    {
        this.templates[p] = [];
        
        tmp = AppUtils.getAllObjects( parts[p].children, "TEMPLATE_", "", false );

        for ( i = 0; i < tmp.length; i++ )
        {
            block = new Block( gltf, tmp[i], this.json.blockSpeeds[p][i], this.json.blockLookAt[p][i], p );
            
            if ( this.json.blockEnvMap )
            {
                block.envMap = this.json.blockEnvMap[p][i];
            }
            
            this.templates[p].push( block );
        }
    }
    
    // RANDOM TRACK ORDER --------------------------------------------------------------

    this.randomBlockOrder = [];
    let blockId = 0;
    let max = 0;
    let mixed = [];
    let mixedCount = 0;
    let blocklen = 8;
    
    for ( p = 0; p < this.templates.length; p++ )
    {
        this.randomBlockOrder[p] = [ 0 ]; // first block is always Template_00
        
        // shuffle templates
        mixed = [];
        
        for ( i = 1; i < this.templates[p].length; i++ )
        {
            mixed.push( i );
        }
        
        if ( this.templates[p].name !== "PART_END" )
        {        
            AppUtils.shuffle( mixed );
            mixedCount = 0;
        }
        else
        {
            blocklen = this.json.blockSpeeds[p].length;
        }
        
        for ( i = 1; i < blocklen; i++ )
        {
            max = mixed.length - 1;
            blockId = mixed[ mixedCount ];
            this.randomBlockOrder[p].push( blockId );
            
            mixedCount++;
            if ( mixedCount > max ) mixedCount = 0;
        }
    }
    
    if ( this.json.blockOrder.length > 0 )
    {
        for ( i = 0; i < this.json.blockOrder.length; i++ )
        {
            if ( this.json.blockOrder[i].length > 0 )
            {
                this.randomBlockOrder[i] = this.json.blockOrder[i];
            }
        }
    }

    let str = "";
    for ( i = 0; i < this.templates.length; i++ )
    {
        str += "randomBlockOrder[" + i + "] = [" + this.randomBlockOrder[i] + "];\n";
    }    
    console.log( str );
    
    // BUILD TRACK FROM ORDER --------------------------------------------------------------

    let pathData = {};
    pathData.position = [];
    pathData.quaternion = [];
    pathData.times = [];
    
    /*
    let camAnimData = {};
    camAnimData.position = [];
    camAnimData.quaternion = [];
    camAnimData.times = [];
    */

    let currentTime = 0;
    let currentPos = new zen3d.Vector3();
    let tmpQuat = new zen3d.Quaternion();
    let currentQuat = new zen3d.Quaternion();
    let pd;
    let pos = new zen3d.Vector3();
    let quat = new zen3d.Quaternion();
    let values;
    
    for ( p = 0; p < this.randomBlockOrder.length; p++ )
    {
        for ( i = 0; i < this.randomBlockOrder[p].length; i++ )
        {
            block = this.templates[p][this.randomBlockOrder[p][i]];
            tmp = block.display.clone();
            tmp.position.copy( currentPos );
            tmp.quaternion.copy( currentQuat );
            tmp.block = block;

            // add to scene
            App.scene.add( tmp );
            
            /*
            // create cam anim data            
            for ( pd = 0; pd < block.camera.tracks[0].times.length; pd++ )
            {
                camAnimData.times.push( block.camera.tracks[0].times[ pd ] + currentTime );
            
                camAnimData.position.push( block.camera.tracks[0].values[ pd * 3 + 0 ] );
                camAnimData.position.push( block.camera.tracks[0].values[ pd * 3 + 1 ] );
                camAnimData.position.push( block.camera.tracks[0].values[ pd * 3 + 2 ] );

                camAnimData.quaternion.push( block.camera.tracks[1].values[ pd * 4 + 0 ] );
                camAnimData.quaternion.push( block.camera.tracks[1].values[ pd * 4 + 1 ] );
                camAnimData.quaternion.push( block.camera.tracks[1].values[ pd * 4 + 2 ] );
                camAnimData.quaternion.push( block.camera.tracks[1].values[ pd * 4 + 3 ] );
            }
            */

            // create path data
            for( pd = 0; pd < 100; pd++ )
            {
                pos.set
                ( 
                    block.path.tracks[0].values[ pd * 3 + 0 ],
                    block.path.tracks[0].values[ pd * 3 + 1 ],
                    block.path.tracks[0].values[ pd * 3 + 2 ]
                );

                pos.applyQuaternion( currentQuat ).add( currentPos );

                values = block.path.tracks[1].values;
                
                quat.set
                (
                    values[ pd * 4 + 0 ],
                    values[ pd * 4 + 1 ],
                    values[ pd * 4 + 2 ],
                    values[ pd * 4 + 3 ]
                );

                quat.multiply( currentQuat );

                pathData.position.push( pos.x, pos.y, pos.z );
                pathData.quaternion.push( quat.x, quat.y, quat.z, quat.w );
                pathData.times.push( currentTime );
                
                // increase currentTime
                currentTime += 0.03333333;
            }

            // continue position & rotation
            currentPos.add( block.out.position.clone().applyQuaternion( currentQuat ) );            
            tmpQuat.copy( currentQuat ).multiply( block.out.quaternion );
            
            /*
            let side = new zen3d.Vector3( 1, 0, 0 ).applyQuaternion( tmpQuat );
            let forward = side.cross( new zen3d.Vector3( 0, 1, 0 ) );
            let up = forward.cross( side );
            let mat3 = new zen3d.Matrix3().set( forward.x, forward.y, forward.z, up.x, up.y, up.z, side.x, side.y, side.z );
            tmpQuat.setFromRotationMatrix( mat3 );
            */

            currentQuat.lerpQuaternionsSlow( currentQuat, tmpQuat, 0.999 ); // fix for inverted quaternions

            this.blocks.push( tmp );
        }
    }
    
    App.onLoaderProgress( { progress: 0.7 } );
    
    // COMPUTE PATH ANIMATION --------------------------------------------------------------
    
    this.path = new zen3d.KeyframeClip( "PATH" );
    this.path.endFrame = currentTime;
    this.path.loop = false;
    
    let posTrack = new zen3d.KeyframeTrack
    ( 
        App.scene,
        "position",
        Float32Array.from( pathData.times ),
        Float32Array.from( pathData.position ),
        true
    );
    let quatTrack = new zen3d.KeyframeTrack
    ( 
        App.scene,
        "quaternion",
        Float32Array.from( pathData.times ),
        Float32Array.from( pathData.quaternion ),
        false
    );
    this.path.tracks.push( posTrack );
    this.path.tracks.push( quatTrack );
    
    // COMPUTE CAMERA LOOKAT ANIM --------------------------------------------------------------
    
    this.camLookAt = new zen3d.KeyframeClip( "CAM_LOOKAT" );
    this.camLookAt.endFrame = currentTime;
    this.camLookAt.loop = false;
    
    posTrack = new zen3d.KeyframeTrack
    ( 
        App.scene,
        "position",
        Float32Array.from( pathData.times ),
        Float32Array.from( pathData.position ),
        true
    );
    quatTrack = new zen3d.KeyframeTrack
    ( 
        App.scene,
        "quaternion",
        Float32Array.from( pathData.times ),
        Float32Array.from( pathData.quaternion ),
        false
    );
    this.camLookAt.tracks.push( posTrack );
    this.camLookAt.tracks.push( quatTrack );
   
    // RENDER ONCE --------------------------------------------------------------
    
    App.renderer.shadowAutoUpdate = false;
    App.renderer.render( App.scene, App.camera.camera );
    
    // CREATE MAP ITEMS --------------------------------------------------------------
    
    objects = AppUtils.getAllObjects( App.scene.children, "", "", true );

    for ( i = 0; i < objects.length; i++ )
    {
        App.onLoaderProgress( { progress: 0.7 + i / objects.length * 0.3 } );
        
        obj = objects[i];
        
        // STATIC        
        if ( obj.name.indexOf( "ITEM_Ground_" ) > -1 )
        {
            new ECS.Static( obj, this.debug );
        }

        // ITEM_Obstacle
        else if ( obj.name.indexOf( "ITEM_Obstacle" ) > -1 )
        {
           let entity = new ECS.Obstacle( obj, ECS.TYPE.OBSTACLE, this.debug );
           
           if ( AppUtils.getAllObjects( obj, "Ice_Tooth", "mesh" ).length > 0 )
           {
               entity.subtype = "ICE_TOOTH";
           }
           
           if ( obj.name.indexOf( "IceTooth_Stand" ) > -1 )
           {
               entity.subtype = "DESTRUCTABLE";
           }
        }
        
        // ITEM_Stone
        else if ( obj.name.indexOf( "ITEM_Stone" ) > -1 )
        {
            new ECS.Obstacle( obj, ECS.TYPE.STONE, this.debug );
        }
        
        // ITEM_Cactus
        else if ( obj.name.indexOf( "ITEM_Cactus" ) > -1 )
        {
            new ECS.Obstacle( obj, ECS.TYPE.CACTUS, this.debug );
        }
        
        // ITEM_Rock_Narrows
        else if ( obj.name.indexOf( "ITEM_Rock_Narrows" ) > -1 )
        {
            new ECS.Obstacle( obj, ECS.TYPE.OBSTACLE, this.debug );
        }
        
        // ITEM_LowRock
        else if ( obj.name.indexOf( "ITEM_LowRock" ) > -1 )
        {
            new ECS.Obstacle( obj, ECS.TYPE.OBSTACLE, this.debug );
        }
        
        // COLLECTABLES
        else if ( obj.name.indexOf( "ITEM_StandardBrick" ) > -1 )
        {
            new ECS.StandardBrick( obj, this.debug );
        }
        else if ( obj.name.indexOf( "ITEM_GoldenBrick" ) > -1 )
        {
            let partId = AppUtils.getSceneRoot( obj ).block.partId;
            
            if ( !this.partHasGoldenBrick[ partId ] )
            {
                this.partHasGoldenBrick[ partId ] = true;
                new ECS.GoldenBrick( obj, this.debug );
                //console.log( "ITEM_GoldenBrick added at:", partId );
            }
            else
            {
                obj.parent.remove( obj );
                //console.log(  partId, "ITEM_GoldenBrick skipped" );
            }
        }
        else if ( obj.name.indexOf( "ITEM_VehicleBrick" ) > -1 )
        {
            new ECS.VehicleBrick( obj, this.debug );
        }
        else if ( obj.name.indexOf( "ITEM_Magnet" ) > -1 )
        {
            new ECS.MagnetBrick( obj, this.debug );
        }
        else if ( obj.name.indexOf( "ITEM_Hourglass" ) > -1 )
        {
            new ECS.Hourglass( obj, this.debug );
        }
        
        // Falling_Rocks        
        else if ( obj.name.indexOf( "ITEM_Falling_Rocks" ) > -1 )
        {
            // animation
            let targets = AppUtils.getAllObjects( obj.children, "Stone_", "mesh" );
            let keyframeClip = ECS.cloneKeyframeClip( this.animations[ "ANIM_Falling_Rocks" ], targets );
            keyframeClip.loop = false;
            let animation = new ECS.Animation( obj, keyframeClip );

            // obstacle
            new ECS.Obstacle( obj, ECS.TYPE.OBSTACLE, this.debug );
            
            // camera anim
            let scriptedEvent;
            
            if ( obj.name === "ITEM_Falling_Rocks_1" )
            {
                scriptedEvent = function(){ App.level.scriptedEvent( 0.8, 1, 0.8, 0.05, 5, new zen3d.Vector3( 0.1, -0.4, -0.4 ), new zen3d.Euler( 0.4, 0, 0 ), 30 ) };
            }
            else
            {
                scriptedEvent = function(){ App.level.scriptedEvent( 0.8, 0.5, 0.8, 0.05, 5, new zen3d.Vector3( 0, -0.1, -0.4 ), new zen3d.Euler( 0.2, 0, 0 ), 30 ) };
            }

            // sensor for animation start
            new ECS.Sensor( obj,
            [ 
                animation.onStart.bind( animation ),
                scriptedEvent
            ]);
        }
        
        // Snake        
        else if ( obj.name.indexOf( "ITEM_Snake" ) > -1 )
        {
            let snake = obj.children[0];
            let asset = this.assetLoader.instantiate( "ITEM_Snake" );
            asset.display.position.copy( snake.position );
            asset.display.quaternion.copy( snake.quaternion );
            asset.display.scale.copy( snake.scale );
            obj.remove( snake );
            
            let entity = new ECS.Snake( obj, asset, this.debug );

            // sensor for animation start
            new ECS.Sensor( obj, [ entity.onStart.bind( entity ) ] );
        }
        
        // ITEM_Stone_Warrior        
        else if ( obj.name.indexOf( "ITEM_Enemy_Stone_Warrior" ) > -1 )
        {            
            let entity = new ECS.StoneWarrior( obj, this.debug );

            // sensor for animation start
            new ECS.Sensor( obj, 
            [ 
                entity.onStart.bind( entity ),
                function(){ App.level.scriptedEvent( 0.5, 2, 0.5, 0.6, 1.5, new zen3d.Vector3( 0, -0.1, 0 ), new zen3d.Euler( 0.1, 0, 0 ), 40 ) }
            ]);
        }
        
        // ITEM_Bridge_Falling
        else if ( obj.name.indexOf( "ITEM_Bridge_Falling" ) > -1 )
        {
            // obstacle
            new ECS.Obstacle( obj, ECS.TYPE.OBSTACLE, this.debug );

            // rocks animation
            let targets = AppUtils.getAllObjects( obj.children, "Lamella", "mesh" );
            let keyframeClip = ECS.cloneKeyframeClip( this.animations[ "ANIM_Bridge_Falling" ], targets );
            ECS.cropKeyframeClip( keyframeClip, 3.333333 );
            keyframeClip.loop = false;
            let animation = new ECS.Animation( obj, keyframeClip );

            // sensor for animation start
            new ECS.Sensor( obj,
            [ 
                animation.onStart.bind( animation ),
                function(){ App.level.scriptedEvent( 0.8, 1, 0.8, 0.5, 1, new zen3d.Vector3( 0, 0, 0 ), new zen3d.Euler( 0, 0, 0 ), 40 ) }
            ]);
        }
        
        // ITEM_Falling_Ice
        else if ( obj.name.indexOf( "ITEM_Falling_Ice" ) > -1 )
        {            
            // audio
            App.audio.create( "falling_ice", App.loader.extract( this.json.baseUrl + "audio/falling_ice.ogg" ) );
            
            // obstacle
            new ECS.Obstacle( obj, ECS.TYPE.OBSTACLE, this.debug );

            // ANIM_Falling_Ice
            let targets = obj.getObjectByName( "ANIM_Falling_Ice" ).children;
            let keyframeClip = ECS.cloneKeyframeClip( this.animations[ "ANIM_Falling_Ice" ], targets );
            //ECS.cropKeyframeClip( keyframeClip, 3 );
            keyframeClip.loop = false;
            let animation = new ECS.Animation( obj, keyframeClip );

            // sensor for animation start
            new ECS.Sensor( obj,
            [ 
                animation.onStart.bind( animation ),
                function(){ App.audio.play( "falling_ice" ) }
            ]);
        }
        
        // ITEM_Lab_Door
        else if ( obj.name.indexOf( "ITEM_Lab_Door" ) > -1 )
        {            
            // audio
            App.audio.create( "lab_door", App.loader.extract( this.json.baseUrl + "audio/lab_door.ogg" ) );
            
            // obstacle
            new ECS.Obstacle( obj, ECS.TYPE.OBSTACLE, this.debug );

            // ANIM_Falling_Ice
            let targets = obj.getObjectByName( "ANIM_Lab_Door" ).children;
            let keyframeClip = ECS.cloneKeyframeClip( this.animations[ "ANIM_Lab_Door" ], targets );
            //ECS.cropKeyframeClip( keyframeClip, 3 );
            keyframeClip.loop = false;
            let animation = new ECS.Animation( obj, keyframeClip );

            // sensor for animation start
            new ECS.Sensor( obj,
            [ 
                animation.onStart.bind( animation ),
                function(){ App.audio.play( "lab_door" ) }
            ]);
        }
        
        // ITEM_Bridge_Standard
        else if ( obj.name.indexOf( "ITEM_Bridge_Standard" ) > -1 )
        {
            new ECS.Obstacle( obj, ECS.TYPE.OBSTACLE, this.debug );
        }
        
        // Firepit
        else if ( obj.name.indexOf( "ITEM_Firepit" ) > -1 )
        {
            new ECS.Firepit( obj, this.debug );
        }
        
        // Waterfall
        else if ( obj.name.indexOf( "Waterfall" ) > -1 )
        {
            new ECS.Waterfall( obj, this.debug );
        }
        
        // ITEM_Temple_Floor_Collapse        
        else if ( obj.name.indexOf( "ITEM_Temple_Floor_Collapse" ) > -1 )
        {
            // animation
            let targets = AppUtils.getAllObjects( obj.children, "temple_floor_", "mesh" );
            let keyframeClip = ECS.cloneKeyframeClip( this.animations[ "ANIM_Temple_Floor_Collapse" ], targets );
            keyframeClip.loop = false;
            let animation = new ECS.Animation( obj, keyframeClip );
            
            // camera anim
            scriptedEvent = function(){ App.level.scriptedEvent( 0.5, 1, 0.5, 0.5, 1, new zen3d.Vector3( 0, 0.1, 0.4 ), new zen3d.Euler( 0, 0, 0 ), 32 ) };

            // sensor for animation start
            new ECS.Sensor( obj,
            [ 
                animation.onStart.bind( animation ),
                scriptedEvent
            ]);
        }
        
        // DEATH_ZONE
        else if ( obj.name.indexOf( "DEATH_ZONE" ) > -1 )
        {
            new ECS.DeathZone( obj, this.debug );
        }
        
        // Finish
        else if ( obj.name.indexOf( "Finish" ) > -1 )
        {
            new ECS.Sensor( obj, [ App.level.prepareFinish.bind( App.level ) ] );
        }
        
        // ITEM_Danger_Hint_1        
        else if ( obj.name.indexOf( "ITEM_Danger_Hint_1" ) > -1 )
        {            
            // camera anim
            scriptedEvent = function(){ App.level.scriptedEvent( 0.8, 1, 0.8, 0.05, 5, new zen3d.Vector3( 0.1, -0.4, -0.4 ), new zen3d.Euler( 0.4, 0, 0 ), 30 ) };

            // sensor for animation start
            new ECS.Sensor( obj,
            [
                scriptedEvent
            ]);
            
            // cleanup
            obj.parent.remove( obj );
        }
        
        // ITEM_Danger_Hint_2
        else if ( obj.name.indexOf( "ITEM_Danger_Hint_2" ) > -1 )
        {            
            // camera anim
            scriptedEvent = function(){ App.level.scriptedEvent( 0.5, 2, 0.5, 0.3, 2.5, new zen3d.Vector3( 0, -0.1, 0 ), new zen3d.Euler( 0.1, 0, 0 ), 20 ) }

            // sensor for animation start
            new ECS.Sensor( obj,
            [
                scriptedEvent
            ]);
            
            // cleanup
            obj.parent.remove( obj );
        }
        
        // ITEM_Lighting
        else if ( obj.name.indexOf( "ITEM_Lighting" ) > -1 )
        {
            // light settings
            let name = AppUtils.getAllObjects( obj.children, "MainPower", "", false )[0].name;
            let mainPower = parseFloat( name.substr( name.lastIndexOf( "_" ) + 1 ) ) * 0.01;
            name = AppUtils.getAllObjects( obj.children, "EnvMap", "", false )[0].name;
            let envMapId = name.substr( name.lastIndexOf( "_" ) + 1 );
            name = AppUtils.getAllObjects( obj.children, "EnvMapIntensity", "", false )[0].name;
            let envMapIntensity = parseFloat( name.substr( name.lastIndexOf( "_" ) + 1 ) ) * 0.01;
            name = AppUtils.getAllObjects( obj.children, "Ambient", "", false )[0].name;
            let ambientColor = new zen3d.Color3( "0x" + name.substr( name.lastIndexOf( "_" ) + 1 ) );
            
            // snow
            name = AppUtils.getAllObjects( obj.children, "Snow", "", false )[0].name;
            let snowOpacity = 1;
            
            if ( name )
            {
                snowOpacity = parseFloat( name.substr( name.lastIndexOf( "_" ) + 1 ) ) * 0.01;
            }
            
            // sensor
            new ECS.Sensor( obj, [ function(){ App.level.setLighting( mainPower, envMapIntensity, snowOpacity, ambientColor ) } ] );
            
            // cleanup
            obj.parent.remove( obj );
        }
        
        // ENEMY_Hypnobrai
        else if ( obj.name.indexOf( "ENEMY_Hypnobrai" ) > -1 )
        {            
            let entity = new ECS.Enemy_Hypnobrai( obj, this.debug );

            // sensor for animation start
            new ECS.Sensor( obj, 
            [ 
                entity.onStart.bind( entity )
            ]);
        }
        
        // ITEM_Chen_Appears
        else if ( obj.name.indexOf( "ITEM_Chen_Appears" ) > -1 )
        {            
            // camera anim
            let levelCallback = App.level.letChenAppear.bind( App.level );

            // sensor for animation start
            new ECS.Sensor( obj,
            [
                levelCallback
            ]);
            
            // cleanup
            obj.parent.remove( obj );
        }
        
        // ITEM_Boxes
        else if ( obj.name.indexOf( "ITEM_Boxes" ) > -1 )
        {
            // obstacle
            let entity = new ECS.Obstacle( obj, ECS.TYPE.BOXES, this.debug );
        }
    }
    
    // collect CANNON bodies in map tiles
    
    let entity;

    for ( i = 0; i < ECS.entities.length; i++ )
    {
        entity = ECS.entities[i];

        if ( entity.body )
        {
            if ( !entity.sceneRoot.physics ) entity.sceneRoot.physics = [];
            entity.sceneRoot.physics.push( entity.body );
        }
    }
    
    // RENDER ONCE --------------------------------------------------------------
    
    App.renderer.shadowAutoUpdate = false;
    App.renderer.render( App.scene, App.camera.camera );
    
    // DONE --------------------------------------------------------------
    
    this.buildTime = Date.now() - this.buildTime;
    console.log( "build time", this.buildTime );

    App.level.onParsingComplete();
}


LevelParser.prototype.get = function( poolId )
{
    return this.objectPools[ poolId ].get();
}

LevelParser.prototype.release = function( poolobject )
{
    this.objectPools[ poolobject.id ].release( poolobject.instance );
}





// ----------------------------------------------------------------------------------------------------------------
// BUILDING BLOCKS ------------------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------------------------------

function Block( gltf, root, speed, lookAtFactor, partId )
{
    this.display = root;
    this.name = root.name;
    this.path = ECS.extractKeyframeClip( gltf, this.display.getObjectByName( "PATH_Bake" ) );
    this.safepath = ECS.extractKeyframeClip( gltf, this.display.getObjectByName( "SAFE_Bake" ) );
    this.safepath_vehicle = ECS.extractKeyframeClip( gltf, this.display.getObjectByName( "SAFE_Bake_Vehicle" ) );
    this.visible = false;
    this.children = AppUtils.getAllObjects( this.display.children, "", "", true );
    this.camera = this.display.getObjectByName( "CAM" );
    this.speed = speed;
    this.lookAtFactor = lookAtFactor;
    this.partId = partId;
    
    // get camera animation
    //this.camera = ECS.extractKeyframeClip( gltf, this.display.getObjectByName( "CAM" ) );
    //ECS.cropKeyframeClip( this.camera, 3.333333 );

    // in point for path building
    this.in = {};
    this.in.position = new zen3d.Vector3( this.path.tracks[0].values[0], this.path.tracks[0].values[1], this.path.tracks[0].values[2] );
    this.in.quaternion = new zen3d.Quaternion( this.path.tracks[1].values[0], this.path.tracks[1].values[1], this.path.tracks[1].values[2], this.path.tracks[1].values[3] );
    
    // out point for path building
    this.out = {};
    this.out.position = new zen3d.Vector3( this.path.tracks[0].values[300], this.path.tracks[0].values[301], this.path.tracks[0].values[302] );
    this.out.quaternion = new zen3d.Quaternion( this.path.tracks[1].values[400], this.path.tracks[1].values[401], this.path.tracks[1].values[402], this.path.tracks[1].values[403] );
    
    // ground width for input
    let ground = AppUtils.getAllObjects( this.display.children, "ITEM_Ground_", "", false )[0];
    
    this.laneMax = 1;
    
    if ( ground )
    {
        if( ground.name.indexOf( "2x" ) !== -1 )
        {
            this.laneMax = 2;
        }
    }    
    
    // setup shadows
    let obj;
    
    for ( i = 0; i < this.children.length; i++ )
    {
        obj = this.children[i];
        
        // disable auto update to increase performance
        obj.autoUpdateMatrix = false;

        if ( obj.name === "COLLIDER" || obj.name === "SENSOR" )
        {
            // hide colliders
            obj.visible = false;
        }
        else
        {
            obj.receiveShadow = true;
            obj.shadowType = zen3d.SHADOW_TYPE.HARD;
            
            if ( obj.name.indexOf( "no_shadow" ) === -1 ) obj.castShadow = true;
        }
    }
}

LevelParser.prototype.destroy = function()
{
    // asset loader
    this.assetLoader.destroy();
    
    // templates
    for ( let a = 0; a < this.templates.length; a++ )
    {
        for ( let b = 0; b < this.templates[a].length; b++ )
        {
            AppUtils.destroyScene( this.templates[a][b].display );
        }
    }
    
    // delete this.props
    for( let p in this )
    {
        this[ p ] = undefined;
    }
}











function ObjectPool( id )
{
    this.id = id;
    this.free = [];
    this.used = [];
}

ObjectPool.prototype.add = function( obj )
{
    if ( obj === undefined ) return;

    this.free.push( obj );
}

ObjectPool.prototype.get = function()
{    
    if ( this.free.length === 0 )
    {
        console.log( this.id, "is exceeded" )
        return null;
    }
    
    let tmp = this.free.pop();
    this.used.push( tmp );
    
    return tmp;
}

ObjectPool.prototype.release = function( obj )
{
    let idx = this.used.indexOf( obj );
    let tmp = this.used.splice( idx, 1 )[0];

    this.free.push( tmp );
}