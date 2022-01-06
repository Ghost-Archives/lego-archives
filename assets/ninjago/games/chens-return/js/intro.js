'use strict';



function Intro( app )
{
    // const
    this.app = app;

    this.STATE =
    {
        INIT:                   0,
        READY:                  1
    };
    
    this.state = this.STATE.INIT;
    
    // scenes & shots
    this.sceneData =
    [
        { 
            id: "scene_00",
            shotEndings: [ 130, 145 ],
            audio:
            [ 
                { 
                    id: "sunrise",
                    shot: 0,
                    loop: true
                }
            ] 
        },
        { 
            id: "scene_01",
            shotEndings: [ 120, 240, 241 ],
            audio: []
        },
        { 
            id: "scene_02",
            shotEndings: [ 85, 140, 141 ],
            audio:
            [ 
                { 
                    id: "vortex_opens",
                    shot: 0,
                    loop: true
                },
                { 
                    id: "chen",
                    shot: 1,
                    loop: true
                } 
            ] 
        },
        { 
            id: "scene_03", 
            shotEndings: [ 150, 151 ], 
            audio: []
        },
        { 
            id: "scene_04", 
            shotEndings: [ 217, 218 ], 
            audio:
            [ 
                { 
                    id: "fight",
                    shot: 0,
                    loop: true
                }
            ]
        },
        { 
            id: "scene_05", 
            shotEndings: [ 95, 170, 175 ], 
            audio: [] 
        },
        { 
            id: "scene_06", 
            shotEndings: [ 60, 61, 240 ],
            audio:
            [ 
                { 
                    id: "lost",
                    shot: 1,
                    loop: false
                }
            ]
        },
        { 
            id: "scene_07", 
            shotEndings: [ 100, 110, 119, 169, 170 ], 
            audio:
            [ 
                { 
                    id: "grief",
                    shot: 0,
                    loop: true
                },
                { 
                    id: "fsm",
                    shot: 3,
                    loop: true
                },
            ]
        },
        { 
            id: "scene_08", 
            shotEndings: [ 60, 105, 150, 220, 227 ], 
            audio: []
        },
        { 
            id: "scene_09", 
            shotEndings: [ 90, 260 ], audio:
            [ 
                { 
                    id: "finale",
                    shot: 1,
                    loop: false
                }
            ] 
        }
    ];
    
    this.currentScene;
    this.sceneCount = 0;
    this.shotCount = 0;
    this.currentAudio = "";
    this.currentEnd = 0;
    
    // create ft
    FT.create( this.app.loader.extract( "intro/intro.json" ), this.app.loader.extract( "intro/intro.png" ), this.init.bind( this ) );
};

Intro.prototype.init = function( ft )
{
    this.ft = ft;
    this.display = AppUtils.createElement( "div", "Intro" );
    this.display.style.width = "1920px";
    this.display.style.height = "1920px";
    this.display.style.overflow = "hidden";

    this.ft.x = 960;
    this.ft.y = 960;
    this.ft.scaleX = this.ft.scaleY = 1.5;
    this.display.append( this.ft.display );
    
    // button_next
    this.button_next = this.ft.button_next;
    this.button_next.visible = false;
    this.button_next.display.style.cursor = "pointer";
    this.button_next.display.addEventListener( "click", this.onClick.bind( this ) );
    
    // audio
    this.app.audio.create( "sunrise", this.app.loader.extract( "intro/audio/sunrise.ogg" ) );
    this.app.audio.create( "vortex_opens", this.app.loader.extract( "intro/audio/vortex_opens.ogg" ) );
    this.app.audio.create( "chen", this.app.loader.extract( "intro/audio/chen.ogg" ) );
    this.app.audio.create( "fight", this.app.loader.extract( "intro/audio/fight.ogg" ) );
    this.app.audio.create( "lost", this.app.loader.extract( "intro/audio/lost.ogg" ) );
    this.app.audio.create( "grief", this.app.loader.extract( "intro/audio/grief.ogg" ) );
    this.app.audio.create( "fsm", this.app.loader.extract( "intro/audio/fsm.ogg" ) );
    this.app.audio.create( "finale", this.app.loader.extract( "intro/audio/finale.ogg" ) );
    
    this.onResize();
    
    // ready    
    this.dispatchEvent( "ready" );
};

Intro.prototype.start = function()
{
    this.ft.enabled = true;
    
    this.sceneCount = 0;
    this.shotCount = 0;
    this.currentAudio = "";
    this.currentEnd = 0;
    
    this.updateSceneData();
    this.ft.gotoAndStop( 1 );
    this.display.style.display = "inherit";
};

Intro.prototype.onClick = function()
{
    if ( this.currentScene.timeline.current < this.currentEnd )
    {
        this.currentScene.gotoAndStop( this.currentEnd );
    }
    else
    {
        this.currentScene.play();
        this.shotCount++;
        this.updateSceneData();
    }
};

Intro.prototype.updateSceneData = function()
{
    this.currentScene = this.ft[ this.sceneData[ this.sceneCount ].id ];
    this.currentEnd = this.sceneData[ this.sceneCount ].shotEndings[ this.shotCount ] - 1;
    
    let audioData = this.sceneData[ this.sceneCount ].audio;
    let len = audioData.length;
    
    if ( len > 0 )
    {
        for ( let i = 0; i < len; i++ )
        {
            if ( audioData[i].shot === this.shotCount )
            {
                this.app.audio.setVolume( this.currentAudio, 0, 1 );
                this.currentAudio = audioData[i].id;
                this.app.audio.play( this.currentAudio, audioData[i].loop );
                break;
            }
        }
    }
    
    this.button_next.gotoAndStop( 0 );
}

Intro.prototype.onUpdate = function( deltaTime )
{
    if ( !this.currentScene ) return;

    if ( this.currentScene.timeline.current === this.currentScene.timeline.total - 1 )
    {
        this.sceneCount++;
        this.shotCount = 0;
        
        if ( this.sceneCount < this.sceneData.length )
        {
            this.updateSceneData();        
            this.ft.gotoAndStop( this.sceneCount + 1 );
        }
        else
        {
            this.onComplete();
            return;
        }
    }
    
    if ( this.currentScene.timeline.current === this.currentEnd )
    {
        if ( this.button_next.timeline.current === 0 )
        {
            this.button_next.alpha = 1;
            this.button_next.gotoAndPlay( 2 );
        }
    }
    else
    {
        this.button_next.alpha = 0.3;
    }
};

Intro.prototype.onComplete = function()
{
    this.currentScene = undefined;
    this.ft.enabled = false;
    this.display.style.display = "none";
    
    setTimeout( this.dispatchEvent.bind( this ), 2000, "complete" );
}

Intro.prototype.onResize = function()
{
    let scale = 1;
    
    if ( this.app.aspectRatio < 0.5625 )
    {
        scale = this.app.stageW / 1080;
    }
    else
    {
        scale = this.app.stageH / 1920;
    }
    
    //scale *= 1.5;
    
    // main display
    let size = 1920 * scale;
    this.display.style.transform = "scale( " + scale + ")";
    this.display.style.top = ( ( this.app.stageH - size ) * 0.5 ) + "px";
    this.display.style.left = ( ( this.app.stageW - size ) * 0.5 ) + "px";
};

Intro.prototype.addEventListener = function( eventType, callback )
{
    if ( !this.hasOwnProperty( eventType ) ) this[eventType] = [];
    this[eventType].push( callback );
};

Intro.prototype.dispatchEvent = function( eventType, eventData )
{
    if ( !this.hasOwnProperty( eventType ) ) return;
    
    for ( let i = 0; i < this[eventType].length; i++ )
    {
        this[eventType][i]( { type: eventType, data: eventData } );
    }
};

