


function HUD( level ) // <editor-fold defaultstate="collapsed">
{    
    this.level = level;
    this.app = level.app;
    
    // props
    this.STATE = 
    {
        INIT:                   0,
        READY:                  1,
        COUNTDOWN:              2,
        RUNNING:                3,
        RESULT_SHOW_1:          4,
        RESULT_SHOW_2:          5,
        RESULT_STANDARD:        6,
        RESULT_GOLDEN:          7,
        RESULT_DISTANCE:        8,
        RESULT_COMPLETE:        9,
        GAME_COMPLETE:          10,
        OUTRO:                  11
    }
    
    this.STATECOUNT = [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
    
    this.state = this.STATE.INIT;
    
    // props
    this.cameraShake = 0;
    
    this.standardBricks = 0;
    this.goldenBricks = 0;
    this.distance = 0;
    
    this.resultCountStandard = 0;
    this.resultCountGolden = 0;
    this.resultCountDistance = 0;
    this.resultCountTotal = 0;
    
    this.oneup_posX = 130;
    this.oneup_posY = 300;
    this.oneup_scale = 0.7;
    
    this.scoreTarget = new zen3d.Vector3( -0.018, 0.026, -0.1 );
    this.levelComplete = false;
    
    // create flashtween display    
    FT.create( this.app.loader.extract( this.app.baseUrl + "/hud/hud.json" ), this.app.loader.extract( this.app.baseUrl + "/hud/hud.png" ), this.init.bind( this ) );
}
// </editor-fold>

HUD.prototype.init = function( root ) // <editor-fold defaultstate="collapsed">
{
    this.root = root;
    let that = this;
    
    // audio
    this.initAudio();
    
    // countdown
    this.countdown = this.root.countdown;
    this.countdown.countdown_digit.width = 60;
    this.countdown.countdown_digit.height = 66;
    this.countdown.countdown_digit.display.style.overflow = "hidden";
    
    // oneup
    this.oneup = this.root.icon_oneup;
    this.oneup.digits.width = 180;
    this.oneup.digits.height = 66;
    this.oneup.digits.display.style.overflow = "hidden";
    this.oneup.digit_single.width = 60;
    this.oneup.digit_single.height = 66;
    this.oneup.digit_single.display.style.overflow = "hidden";

    // standard & golden brick
    this.standard_brick_digit_1 = this.root.standard_bricks.standard_bricks_anim.digit_1;
    this.standard_brick_digit_2 = this.root.standard_bricks.standard_bricks_anim.digit_2;
    this.standard_brick_digit_3 = this.root.standard_bricks.standard_bricks_anim.digit_3;
    this.golden_brick_digit_1 = this.root.golden_bricks.golden_bricks_anim.digit_1;
    this.golden_brick_digit_2 = this.root.golden_bricks.golden_bricks_anim.digit_2;
    
    this.standard_brick_digit_1.display.style.width = "60px";
    this.standard_brick_digit_1.display.style.height = "65px";
    this.standard_brick_digit_1.display.style.overflow = "hidden";
    
    this.standard_brick_digit_2.display.style.width = "60px";
    this.standard_brick_digit_2.display.style.height = "65px";
    this.standard_brick_digit_2.display.style.overflow = "hidden";
    
    this.standard_brick_digit_3.display.style.width = "60px";
    this.standard_brick_digit_3.display.style.height = "65px";
    this.standard_brick_digit_3.display.style.overflow = "hidden";
    
    this.golden_brick_digit_1.display.style.width = "60px";
    this.golden_brick_digit_1.display.style.height = "65px";
    this.golden_brick_digit_1.display.style.overflow = "hidden";
    
    this.golden_brick_digit_2.display.style.width = "60px";
    this.golden_brick_digit_2.display.style.height = "65px";
    this.golden_brick_digit_2.display.style.overflow = "hidden";
    this.golden_brick_digit_2.gotoAndStop( 5 );
    
    // distance
    this.distance_digit_1 = this.root.distance.distance_anim.digit_1;
    this.distance_digit_2 = this.root.distance.distance_anim.digit_2;
    this.distance_digit_3 = this.root.distance.distance_anim.digit_3;
    
    this.distance_digit_1.display.style.width = "60px";
    this.distance_digit_1.display.style.height = "65px";
    this.distance_digit_1.display.style.overflow = "hidden";
    
    this.distance_digit_2.display.style.width = "60px";
    this.distance_digit_2.display.style.height = "65px";
    this.distance_digit_2.display.style.overflow = "hidden";
    
    this.distance_digit_3.display.style.width = "60px";
    this.distance_digit_3.display.style.height = "65px";
    this.distance_digit_3.display.style.overflow = "hidden";
    
    // result intro
    this.result_intro = this.root.result_intro;
    
    // result screen    
    this.result_screen = this.root.result_screen;
    
    this.result_standard_digit_1 = this.root.result_screen.result_standard_bricks.digits.digit_1;
    this.result_standard_digit_1.display.style.width = "60px";
    this.result_standard_digit_1.display.style.height = "65px";
    this.result_standard_digit_1.display.style.overflow = "hidden";
    
    this.result_standard_digit_2 = this.root.result_screen.result_standard_bricks.digits.digit_2;
    this.result_standard_digit_2.display.style.width = "60px";
    this.result_standard_digit_2.display.style.height = "65px";
    this.result_standard_digit_2.display.style.overflow = "hidden";
    
    this.result_standard_digit_3 = this.root.result_screen.result_standard_bricks.digits.digit_3;
    this.result_standard_digit_3.display.style.width = "60px";
    this.result_standard_digit_3.display.style.height = "65px";
    this.result_standard_digit_3.display.style.overflow = "hidden";
    
    this.root.result_screen.result_standard_bricks.result_standard_bricks_static.display.style.width = "110px";
    this.root.result_screen.result_standard_bricks.result_standard_bricks_static.display.style.height = "66px";
    this.root.result_screen.result_standard_bricks.result_standard_bricks_static.display.style.overflow = "hidden";
    
    this.result_golden_digit_1 = this.root.result_screen.result_golden_bricks.digits.digit_1;
    this.result_golden_digit_1.display.style.width = "60px";
    this.result_golden_digit_1.display.style.height = "65px";
    this.result_golden_digit_1.display.style.overflow = "hidden";
    
    this.result_golden_digit_2 = this.root.result_screen.result_golden_bricks.digits.digit_2;
    this.result_golden_digit_2.display.style.width = "60px";
    this.result_golden_digit_2.display.style.height = "65px";
    this.result_golden_digit_2.display.style.overflow = "hidden";
    
    this.result_golden_digit_3 = this.root.result_screen.result_golden_bricks.digits.digit_3;
    this.result_golden_digit_3.display.style.width = "60px";
    this.result_golden_digit_3.display.style.height = "65px";
    this.result_golden_digit_3.display.style.overflow = "hidden";
    
    this.root.result_screen.result_golden_bricks.result_golden_bricks_static.display.style.width = "200px";
    this.root.result_screen.result_golden_bricks.result_golden_bricks_static.display.style.height = "66px";
    this.root.result_screen.result_golden_bricks.result_golden_bricks_static.display.style.overflow = "hidden";
    
    this.result_distance_digit_1 = this.root.result_screen.result_distance.digits.digit_1;
    this.result_distance_digit_1.display.style.width = "60px";
    this.result_distance_digit_1.display.style.height = "65px";
    this.result_distance_digit_1.display.style.overflow = "hidden";
    
    this.result_distance_digit_2 = this.root.result_screen.result_distance.digits.digit_2;
    this.result_distance_digit_2.display.style.width = "60px";
    this.result_distance_digit_2.display.style.height = "65px";
    this.result_distance_digit_2.display.style.overflow = "hidden";
    
    this.result_distance_digit_3 = this.root.result_screen.result_distance.digits.digit_3;
    this.result_distance_digit_3.display.style.width = "60px";
    this.result_distance_digit_3.display.style.height = "65px";
    this.result_distance_digit_3.display.style.overflow = "hidden";
    
    this.root.result_screen.result_distance.result_distance_static.display.style.width = "150px";
    this.root.result_screen.result_distance.result_distance_static.display.style.height = "66px";
    this.root.result_screen.result_distance.result_distance_static.display.style.overflow = "hidden";
    
    this.root.result_screen.result_total.digits_total.display.style.width = "210px";
    this.root.result_screen.result_total.digits_total.display.style.height = "66px";
    this.root.result_screen.result_total.digits_total.display.style.overflow = "hidden";
    
    this.result_total_digit_1 = this.root.result_screen.result_total.digits_total.digit_1;
    this.result_total_digit_2 = this.root.result_screen.result_total.digits_total.digit_2;
    this.result_total_digit_3 = this.root.result_screen.result_total.digits_total.digit_3;
    this.result_total_digit_4 = this.root.result_screen.result_total.digits_total.digit_4;
    
    this.abort_click = this.root.result_screen.result_abort_click;
    this.abort_click.display.addEventListener( "click", function() { that.onClick( that.abort_click ) } );
    
    // pause
    this.root.button_pause.display.style.cursor = "pointer";
    this.root.button_pause.display.addEventListener( "click", function() { that.onClick( that.root.button_pause ) } );

    // result_buttons
    this.result_buttons = this.root.result_buttons;
    
    // home
    this.button_home = this.root.result_buttons.btn_home;
    this.button_home.display.style.cursor = "pointer";
    this.button_home.display.addEventListener( "click", function() { that.onClick( that.button_home ) } );
    this.button_home.display.addEventListener( "mouseover", function() { that.onOver( that.button_home ) } );
    this.button_home.display.addEventListener( "mouseout", function() { that.onOut( that.button_home ) } );
    
    // retry
    this.button_retry = this.root.result_buttons.btn_retry;
    this.button_retry.display.style.cursor = "pointer";
    this.button_retry.display.addEventListener( "click", function() { that.onClick( that.button_retry ) } );
    this.button_retry.display.addEventListener( "mouseover", function() { that.onOver( that.button_retry ) } );
    this.button_retry.display.addEventListener( "mouseout", function() { that.onOut( that.button_retry ) } );
    
    // next
    this.button_next = this.root.result_buttons.btn_next;
    this.button_next.display.style.cursor = "pointer";
    this.button_next.display.addEventListener( "click", function() { that.onClick( that.button_next ) } );
    this.button_next.display.addEventListener( "mouseover", function() { that.onOver( that.button_next ) } );
    this.button_next.display.addEventListener( "mouseout", function() { that.onOut( that.button_next ) } );
    
    // golden ninjas
    if ( this.root.golden_ninjas )
    {
        this.golden_ninjas = this.root.golden_ninjas;
        this.golden_kai = this.golden_ninjas.golden_kai;
        this.golden_cole = this.golden_ninjas.golden_cole;
        this.golden_zane = this.golden_ninjas.golden_zane;
    }
    
    // bg
    this.bg = AppUtils.createElement( "div", "bg" );
    AppUtils.setProps( this.bg,
    {
       width: "1920px",
       height: "1920px",
       backgroundColor: "#000",
       pointerEvents: "none"
    });
    
    if ( this.level.levelId === 3 )
    {
        this.root.standard_bricks.display.style.display = "none";
        this.root.golden_bricks.display.style.display = "none";
        this.root.distance.display.style.display = "none";
    }

    // add to stage
    this.app.stage.insertBefore( this.bg, this.app.homescreen.display );
    this.app.stage.insertBefore( this.root.display, this.app.homescreen.display );
    
    // finish
    this.state = this.STATE.READY;
}
// </editor-fold>

HUD.prototype.initAudio = function() // <editor-fold defaultstate="collapsed">
{
    this.standardBrickAudioDeltaTime = 0;
    this.standardBrickAudioMinDeltaTime = 0.16;
    this.standardBrickKeyTone = 0.98;
    //this.standardBrickMelody = [ 13, 16, 13, 11, 8, 1, 6, 4, 6, 1, 6, 1, 11, 1, 11, 1, 8, 11, 8, 6, 4, 1, 6, 4, 6, 1, 6, 1, 8, 3, 8, 3 ];
    this.standardBrickMelody = [ 1, 3, 6, 8, 11, 13, 15, 18, 20, 23, 26 ];
    this.standardBrickMelodyPos = 0;
    this.standardBrickMelodyLength = this.standardBrickMelody.length;

    this.frequencies = 
    [ 
        1,
        1.059463,
        1.122462,
        1.189207,
        1.259921,
        1.334840,
        1.414214,
        1.498307,
        1.587401,
        1.681793,
        1.781797,
        1.887749,
        2.000000
    ];
    
    let i = 0;
    let before = [];    
    for ( i = 0; i < 12; i++ )
    {
        before.push( this.frequencies[i] * 0.5 );
    };    
    let after = [];
    for ( i = 0; i < 13; i++ )
    {
        after.push( this.frequencies[i] * 2 );
    };
    
    this.frequencies = before.concat( this.frequencies ).concat( after );

    this.standardBrickSample = 0;
    this.standardBrickSampleMax = 2;

    if ( this.level.levelId < 3 )
    {
        this.app.audio.create( "standard_brick_0",      this.app.loader.extract( this.app.baseUrl + "/audio/standard_brick.ogg" ) );
        this.app.audio.create( "standard_brick_1",      this.app.loader.extract( this.app.baseUrl + "/audio/standard_brick.ogg" ) );
        this.app.audio.create( "standard_brick_2",      this.app.loader.extract( this.app.baseUrl + "/audio/standard_brick.ogg" ) );
        this.app.audio.create( "item",                  this.app.loader.extract( this.app.baseUrl + "/audio/item.ogg" ) );
        this.app.audio.create( "hourglass_start",       this.app.loader.extract( this.app.baseUrl + "/audio/hourglass_start.ogg" ) );
        this.app.audio.create( "hourglass_end",         this.app.loader.extract( this.app.baseUrl + "/audio/hourglass_end.ogg" ) );
        this.app.audio.create( "magnet_loop",           this.app.loader.extract( this.app.baseUrl + "/audio/magnet_loop.ogg" ) );
        this.app.audio.create( "oneup",                 this.app.loader.extract( this.app.baseUrl + "/audio/oneup.ogg" ) );
        this.app.audio.create( "onedown",               this.app.loader.extract( this.app.baseUrl + "/audio/onedown.ogg" ) );
        this.app.audio.create( "countdown",             this.app.loader.extract( this.app.baseUrl + "/audio/countdown.ogg" ) );
        this.app.audio.create( "golden_brick",          this.app.loader.extract( this.app.baseUrl + "/audio/golden_brick.ogg" ) );
        this.app.audio.create( "vehicle", this.app.loader.extract( this.app.baseUrl + "/audio/vehicle.ogg" ) );
    }
    else
    {
        this.app.audio.create( "standard_brick_0",      this.app.loader.extract( this.app.baseUrl + "/audio/standard_brick.ogg" ) );
        this.app.audio.create( "standard_brick_1",      this.app.loader.extract( this.app.baseUrl + "/audio/standard_brick.ogg" ) );
        this.app.audio.create( "standard_brick_2",      this.app.loader.extract( this.app.baseUrl + "/audio/standard_brick.ogg" ) );
        this.app.audio.create( "oneup",                 this.app.loader.extract( this.app.baseUrl + "/audio/oneup.ogg" ) );
        this.app.audio.create( "onedown",               this.app.loader.extract( this.app.baseUrl + "/audio/onedown.ogg" ) );
        this.app.audio.create( "countdown",             this.app.loader.extract( this.app.baseUrl + "/audio/countdown.ogg" ) ); 
    }
}
// </editor-fold>

HUD.prototype.fadein = function() // <editor-fold defaultstate="collapsed">
{
    gsap.to( this.bg, 1, { ease: Linear.easeNone, opacity: 0 } );
    this.root.button_pause.gotoAndPlay( "IN" );
    
    this.state = this.STATE.COUNTDOWN;
}
// </editor-fold>

HUD.prototype.fadeout = function() // <editor-fold defaultstate="collapsed">
{
    // hide result buttons    
    this.hideResultButtons();
    
    // hide result intro & result screen
    if ( this.result_intro.timeline.current > 0 )
    {
        if ( this.level.state !== this.level.STATE.LEVEL_COMPLETE )
        {
            this.result_intro.gotoAndPlay( "FAIL_OUT" );
            this.result_screen.gotoAndPlay( "OUT" );
        }
        else
        {
            this.result_intro.gotoAndPlay( "SUCCESS_OUT" );
            this.result_screen.gotoAndPlay( "OUT" );
        }
    }

    // fade in bg
    gsap.to( this.bg, 0.2, { ease: Linear.easeNone, opacity: 1 } );
}
// </editor-fold>

HUD.prototype.showIngame = function() // <editor-fold defaultstate="collapsed">
{
    this.root.standard_bricks.gotoAndPlay( "IN" );
    this.root.golden_bricks.gotoAndPlay( "IN" );
    this.root.distance.gotoAndPlay( "IN" );
}
// </editor-fold>

HUD.prototype.hideIngame = function() // <editor-fold defaultstate="collapsed">
{
    // hide special icons
    if ( this.root.icon_magnet.timeline.current > 0 ) this.Icon_Magnet_Hide();
    if ( this.root.icon_hourglass.timeline.current > 0 ) this.Icon_Hourglass_Hide();
    if ( this.root.icon_vehicle.timeline.current > 0 ) this.Icon_Vehicle_Hide();
    gsap.to( this.oneup, 0.3, { ease: Quad.easeIn, x: -200 } );
    
    // hide scores
    this.root.standard_bricks.gotoAndPlay( "OUT" );
    this.root.golden_bricks.gotoAndPlay( "OUT" );
    this.root.distance.gotoAndPlay( "OUT" );
    
    // hide pause
    this.root.button_pause.gotoAndPlay( "OUT" );
}
// </editor-fold>

HUD.prototype.addStandardBrick = function() // <editor-fold defaultstate="collapsed">
{
    this.standardBricks++;
    this.updateIngameScore();
    
    // audio
    this.playStandardBrickAudio( this.standardBrickAudioMinDeltaTime );
    
    // oneup?
    if ( this.standardBricks % 100 === 0 )
    {
        this.app.audio.play( "oneup" );
        this.level.extralife++;
        
        this.oneup.x = this.halfWidth;
        this.oneup.y = 400 * this.scale;
        this.oneup.scaleX = this.oneup.scaleY = this.scale;
        
        this.oneup.gotoAndPlay( "SHOW" );
        this.oneup.digit_single.digit.y = - this.level.extralife * 66;
        this.oneup.digits.digit_1.gotoAndStop( this.standardBricks * 0.01 );

        gsap.to( this.oneup, 0.3, { ease: Quad.easeInOut, x: this.oneup_posX * this.scale, y: this.oneup_posY * this.scale, scaleX: this.scale * this.oneup_scale, scaleY: this.scale * this.oneup_scale, delay: 1.3 } );
    }
}
// </editor-fold>

HUD.prototype.useExtraLife = function() // <editor-fold defaultstate="collapsed">
{
    this.app.audio.play( "onedown" );
    gsap.to( this.oneup, 0.3, { ease: Quad.easeInOut, x: this.halfWidth, y: 400 * this.scale, scaleX: this.scale, scaleY: this.scale } );    
    setTimeout( this.useExtraLife2.bind( this ), 600 );
}
// </editor-fold>

HUD.prototype.useExtraLife2 = function() // <editor-fold defaultstate="collapsed">
{
    this.oneup.gotoAndPlay( "USE" );
    this.oneup.digit_single.digit.y = - this.level.extralife * 66;
    
    if ( this.level.extralife > 0 )
    {
        gsap.to( this.oneup, 0.3, { ease: Quad.easeInOut, x: this.oneup_posX * this.scale, y: this.oneup_posY * this.scale, scaleX: this.scale * this.oneup_scale, scaleY: this.scale * this.oneup_scale, delay: 0.5 } );
    }
    else
    {
        gsap.to( this.oneup, 0.2, { ease: Quad.easeIn, scaleX: 0, scaleY: 0, delay: 0.5 } );
    }
}
// </editor-fold>

HUD.prototype.addGoldenBrick = function() // <editor-fold defaultstate="collapsed">
{
    this.goldenBricks ++;
    this.root.golden_bricks.gotoAndPlay( "ADD" );
    this.root.icon_golden_brick.gotoAndPlay( "SHOW" );
    this.updateIngameScore();
    
    this.app.audio.play( "golden_brick" );
}
// </editor-fold>

HUD.prototype.addDistance = function( num ) // <editor-fold defaultstate="collapsed">
{
    this.distance = Math.round( num * 100 );

    this.root.distance.y = this.app.stageH - ( 200 + this.distance * 12 ) * this.scale;
   
    let one = this.distance % 10;
    let ten = Math.floor( this.distance * 0.1 ) % 10;
    let hundred = Math.floor( this.distance * 0.01 ) % 10;
    
    this.distance_digit_3.gotoAndStop( one );
    this.distance_digit_2.gotoAndStop( ten );
    this.distance_digit_1.gotoAndStop( hundred );
}
// </editor-fold>

HUD.prototype.updateIngameScore = function() // <editor-fold defaultstate="collapsed">
{
    // standard bricks    
    let one = this.standardBricks % 10;
    let ten = Math.floor( this.standardBricks * 0.1 ) % 10;
    let hundred = Math.floor( this.standardBricks * 0.01 ) % 10;
    
    this.standard_brick_digit_1.gotoAndStop( hundred );
    this.standard_brick_digit_2.gotoAndStop( ten );
    this.standard_brick_digit_3.gotoAndStop( one );
    
    // golden bricks    
    this.golden_brick_digit_1.gotoAndStop( this.goldenBricks );
}
// </editor-fold>

HUD.prototype.reset = function() // <editor-fold defaultstate="collapsed">
{
    this.standardBricks = 
    this.goldenBricks = 
    this.distance =
    this.resultCountStandard = 
    this.resultCountGolden = 
    this.resultCountDistance = 
    this.resultCountTotal = 0;
    
    this.shake = 0;
    
    this.updateIngameScore();
    
    this.oneup.scaleX = this.oneup.scaleY = 0;
    
    // reset statecount
    for ( let i = 0; i < this.STATECOUNT.length; i++ )
    {
        this.STATECOUNT[i] = 0;
    }

    this.state = this.STATE.READY;
}
// </editor-fold>

HUD.prototype.showGoldenNinjas = function( id ) // <editor-fold defaultstate="collapsed">
{
    if ( id === 0 )
    {
        this.golden_kai.timeline.current = 0;
        this.golden_cole.timeline.current = 0;
        this.golden_zane.timeline.current = 0;
    }
    
    if ( id === 1 )
    {
        this.golden_kai.gotoAndStop( 7 );
        this.golden_cole.timeline.current = 0;
        this.golden_zane.timeline.current = 0;
    }
    if ( id === 2 )
    {
        this.golden_kai.gotoAndStop( 7 );
        this.golden_cole.gotoAndStop( 7 );
        this.golden_zane.timeline.current = 0;
    }
    
    this.golden_ninjas.gotoAndPlay( "IN" );
}
// </editor-fold>

HUD.prototype.lostOnePlayer = function( id ) // <editor-fold defaultstate="collapsed">
{
    this.state = this.STATE.LOST_ONE_PLAYER;
    
    if ( id === 1 )
    {
        setTimeout( this.golden_kai.play.bind( this.golden_kai ), 800 );
    }
    if ( id === 2 )
    {
        this.golden_kai.gotoAndStop( 7 );
        setTimeout( this.golden_cole.play.bind( this.golden_cole ), 800 );
    }
    if ( id === 3 )
    {
        this.golden_kai.gotoAndStop( 7 );
        this.golden_cole.gotoAndStop( 7 );
        setTimeout( this.golden_zane.play.bind( this.golden_zane ), 800 );
    }

    this.root.button_pause.gotoAndPlay( "OUT" );
}
// </editor-fold>

HUD.prototype.hideGoldenNinjas = function( id ) // <editor-fold defaultstate="collapsed">
{
    this.golden_ninjas.gotoAndPlay( "OUT" );    
    gsap.to( this.bg, 0.3, { ease: Linear.easeNone, opacity: 1 } );
}
// </editor-fold>

HUD.prototype.showResultScreen = function( levelComplete ) // <editor-fold defaultstate="collapsed">
{
    this.levelComplete = levelComplete;
    if ( levelComplete ) this.distance = 100;
    
    // hide ingame
    this.hideIngame();

    // show bg
    gsap.to( this.bg, 0.5, { ease: Linear.easeNone, opacity: 0.5 } );
    
    // set state
    this.state = this.STATE.RESULT_SHOW_1;
}
// </editor-fold>

HUD.prototype.showResultScreenComplete = function() // <editor-fold defaultstate="collapsed">
{
    this.resultCountStandard = this.standardBricks * 3;
    this.resultCountGolden = this.goldenBricks * 150;
    this.resultCountDistance = this.distance * 15;

    this.updateResultScreen();
    
    let isNewRecord = this.app.updateLocalStorage( this.level.tries, this.resultCountTotal, this.standardBricks, this.goldenBricks, this.distance );
    
    if ( isNewRecord )
    {
        this.app.audio.play( "oneup" );
        this.result_screen.gotoAndPlay( "COMPLETE_RECORD" );
    }
    else
    {
        this.result_screen.gotoAndStop( "COMPLETE" );
    }

    this.showResultButtons();
    
    this.state = this.STATE.RESULT_COMPLETE;
}
// </editor-fold>

HUD.prototype.showResultButtons = function() // <editor-fold defaultstate="collapsed">
{
    if ( this.levelComplete )
    {
        this.button_next.display.style.display = "inline";
    }
    else
    {
        this.button_next.display.style.display = "none";
    }
    
    this.result_buttons.gotoAndPlay( "IN" );
};
// </editor-fold>

HUD.prototype.hideResultButtons = function() // <editor-fold defaultstate="collapsed">
{
    this.button_home.gotoAndStop( 0 );
    this.button_retry.gotoAndStop( 0 );
    this.button_next.gotoAndStop( 0 );
    this.result_buttons.gotoAndPlay( "OUT" );
}
// </editor-fold>

HUD.prototype.onOver = function( target ) // <editor-fold defaultstate="collapsed">
{
    
    switch( target )
    {
        case this.button_home:            
            this.button_home.gotoAndPlay( "OVER" );            
        break;
        
        case this.button_retry:            
            this.button_retry.gotoAndPlay( "OVER" );            
        break;
        
        case this.button_next:            
            this.button_next.gotoAndPlay( "OVER" );            
        break;
    }
}
// </editor-fold>

HUD.prototype.onOut = function( target ) // <editor-fold defaultstate="collapsed">
{
    switch( target )
    {
        case this.button_home:            
            this.button_home.gotoAndPlay( "OUT" );            
        break;
        
        case this.button_retry:            
            this.button_retry.gotoAndPlay( "OUT" );            
        break;
        
        case this.button_next:            
            this.button_next.gotoAndPlay( "OUT" );            
        break;
    }
}
// </editor-fold>

HUD.prototype.onClick = function( target ) // <editor-fold defaultstate="collapsed">
{
    switch( target )
    {
        case this.button_home:
            
            this.level.destroy();
            
        break;
        
        case this.button_retry:

            this.level.restartLevel();
            
        break;
        
        case this.button_next:
            
            this.level.destroy();
            
        break;
        
        case this.abort_click:
            
            if ( this.state !== this.STATE.RESULT_COMPLETE ) this.showResultScreenComplete();
            
        break;
        
        case this.root.button_pause:
            
            if ( this.level.state !== this.level.STATE.PAUSED )
            {
                this.levelStateBeforePause = this.level.state;
                this.levelStateCountBeforePause = this.level.STATECOUNT[ this.level.state ];
                this.level.deltaTimeScale = 0;
                this.level.state = this.level.STATE.PAUSED;
                
                this.showResultButtons();
                if ( !this.level.jsonData.debugLighting ) gsap.to( this.bg, 0.5, { ease: Linear.easeNone, opacity: 0.5 } );
            }
            else
            {
                this.level.deltaTimeScale = 1;
                this.level.state = this.level.lastState = this.levelStateBeforePause;
                this.level.STATECOUNT[ this.level.state ] = this.levelStateCountBeforePause;
                
                this.hideResultButtons();
                gsap.to( this.bg, 0.2, { ease: Linear.easeNone, opacity: 0 } );
            }
            
        break;
    }
}
// </editor-fold>

HUD.prototype.forcePause = function() // <editor-fold defaultstate="collapsed">
{
    if ( this.level.state !== this.level.STATE.PAUSED )
    {
        this.levelStateBeforePause = this.level.state;
        this.levelStateCountBeforePause = this.level.STATECOUNT[ this.level.state ];
        this.level.deltaTimeScale = 0;
        this.level.state = this.level.STATE.PAUSED;
        
        this.showResultButtons();
        gsap.to( this.bg, 0.5, { ease: Linear.easeNone, opacity: 0.5 } );
    }
}
// </editor-fold>

HUD.prototype.showGameComplete = function() // <editor-fold defaultstate="collapsed">
{    
    this.root.game_complete.gotoAndPlay( 1 );
    this.root.button_pause.gotoAndPlay( "OUT" );
    
    this.state = this.STATE.GAME_COMPLETE;
};
// </editor-fold>

HUD.prototype.showOutro = function() // <editor-fold defaultstate="collapsed">
{    
    this.root.game_complete.play();
    this.state = this.STATE.OUTRO;
};
// </editor-fold>

// -------------------------------------------------- ITEMS -------------------------------------------------------

HUD.prototype.Icon_Magnet_Show = function() // <editor-fold defaultstate="collapsed">
{
    this.root.icon_magnet.icon_magnet_anim.gotoAndStop( 0 );
    this.root.icon_magnet.gotoAndPlay( "SHOW" );
    this.app.audio.play( "item" );
    this.app.audio.play( "magnet_loop", true );
}
// </editor-fold>

HUD.prototype.Icon_Magnet_Update = function( time ) // <editor-fold defaultstate="collapsed">
{
    if ( time > 6 ) return;
    this.root.icon_magnet.icon_magnet_anim.gotoAndStop( Math.round( time * 2 ) );
}
// </editor-fold>

HUD.prototype.Icon_Magnet_Hide = function() // <editor-fold defaultstate="collapsed">
{
    this.root.icon_magnet.gotoAndPlay( "HIDE" );
    this.app.audio.stop( "magnet_loop" );
}
// </editor-fold>

HUD.prototype.Icon_Hourglass_Show = function() // <editor-fold defaultstate="collapsed">
{
    this.root.icon_hourglass.icon_hourglass_anim.gotoAndStop( 0 );
    this.root.icon_hourglass.gotoAndPlay( "SHOW" );
    this.app.audio.play( "hourglass_start" );    
}
// </editor-fold>

HUD.prototype.Icon_Hourglass_Update = function( time ) // <editor-fold defaultstate="collapsed">
{
    if ( time > 6 ) return;
    this.root.icon_hourglass.icon_hourglass_anim.gotoAndStop( Math.round( time * 2 ) );
}
// </editor-fold>

HUD.prototype.Icon_Hourglass_Hide = function() // <editor-fold defaultstate="collapsed">
{
    this.root.icon_hourglass.gotoAndPlay( "HIDE" );
    this.app.audio.play( "hourglass_end" );
}
// </editor-fold>

HUD.prototype.Icon_Vehicle_Show = function() // <editor-fold defaultstate="collapsed">
{
    this.root.icon_vehicle.icon_vehicle_anim.gotoAndStop( 0 );
    this.root.icon_vehicle.gotoAndPlay( "SHOW" );
        
    this.app.audio.play( "item" );
    this.app.audio.play( "vehicle", true );
}
// </editor-fold>

HUD.prototype.Icon_Vehicle_Update = function( count ) // <editor-fold defaultstate="collapsed">
{
    this.root.icon_vehicle.icon_vehicle_anim.gotoAndStop( Math.ceil( this.level.player.vehicleStateCount / this.level.player.vehicleMaxDuration * 10 ) );
}
// </editor-fold>

HUD.prototype.Icon_Vehicle_Hide = function() // <editor-fold defaultstate="collapsed">
{
    this.root.icon_vehicle.gotoAndPlay( "HIDE" );
    this.app.audio.stop( "vehicle" );
}
// </editor-fold>

// -------------------------------------------------- UPDATE -------------------------------------------------------

HUD.prototype.onUpdate = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    if ( this.state <= this.STATE.READY ) return;

    // camera shake
    
    if ( this.cameraShake > 0 )
    {
        this.cameraShake -= deltaTime;
        
        if ( this.cameraShake > 0 )
        {
            this.root.x = this.cameraShake * ( Math.random() * 16 - 8 );
            this.root.y = this.cameraShake * ( Math.random() * 16 - 8 );
        }
        else
        {
            this.root.x = 0;
            this.root.y = 0;
        }
    }
    
    // states
    
    this.STATECOUNT[this.state] += deltaTime;
    
    let max = 0;
    let increment = 0;
    
    switch( this.state )
    {
        case this.STATE.COUNTDOWN:
            
            if ( this.level.state === this.level.STATE.PAUSED )
            {
                this.countdown.stop(0);
                break;
            }
            else
            {
                this.countdown.play();
            }

            if ( this.countdown.timeline.current === 0 )
            {
                let frame = Math.round( this.STATECOUNT[this.state] );
                this.countdown.countdown_digit.gotoAndStop( frame );
                this.countdown.gotoAndPlay( 1 );

                if ( frame < 3 )
                {
                    this.app.audio.play( "countdown", false, 1, 1 );
                }
                else
                {
                    this.app.audio.play( "countdown", false, 1, 2 );
                }
            }

            if ( this.STATECOUNT[this.state] > 3 )
            {
                this.state = this.STATE.RUNNING;
            }
            
        break;
        
        case this.STATE.RESULT_SHOW_1:
            
            if ( this.STATECOUNT[this.state] > 0.3 )
            {
                this.state = this.STATE.RESULT_SHOW_2;
                
                if ( !this.levelComplete )
                {
                    this.result_intro.gotoAndPlay( "FAIL" );
                }
                else
                {
                    this.result_intro.gotoAndPlay( "SUCCESS" );
                }
                
                this.result_screen.gotoAndPlay( 1 );
            }
        
        break;
        
        case this.STATE.RESULT_SHOW_2:
            
            if ( this.STATECOUNT[this.state] > 0.3 )
            {
                this.state = this.STATE.RESULT_STANDARD;
                this.cameraShake = 0.5;
            }
        
        break;
        
        case this.STATE.RESULT_STANDARD:

            max = this.standardBricks * 3;
            increment = Math.floor( max * deltaTime );
            increment = Math.max( increment, 1 );
            
            if ( this.resultCountStandard < max )
            {
                this.resultCountStandard += increment;
                this.playStandardBrickAudio( deltaTime );
            }
            else if ( this.STATECOUNT[this.state] > 1 )
            {
                this.state = this.STATE.RESULT_GOLDEN;
                this.result_screen.play();
            }
            
            this.updateResultScreen();
            
        break;
        
        case this.STATE.RESULT_GOLDEN:

            max = this.goldenBricks * 3;
            increment = Math.floor( max * deltaTime );
            increment = Math.max( increment, 1 );
            
            if ( this.resultCountGolden < max )
            {
                this.resultCountGolden += increment;
                this.playStandardBrickAudio( deltaTime );
            }
            else if ( this.STATECOUNT[this.state] > 1 )
            {
                this.state = this.STATE.RESULT_DISTANCE;
                this.result_screen.play();
            }
            
            this.updateResultScreen();
        
        break;
        
        case this.STATE.RESULT_DISTANCE:

            max = this.distance * 15;
            increment = Math.floor( max * deltaTime );
            increment = Math.max( increment, 1 );
            
            if ( this.resultCountDistance < max )
            {
                this.resultCountDistance += increment;
                this.playStandardBrickAudio( deltaTime );
            }
            else if ( this.STATECOUNT[this.state] > 1 )
            {
                this.showResultScreenComplete();
            }
            
            this.updateResultScreen();
        
        break;
        
        case this.STATE.OUTRO:

            if ( this.STATECOUNT[this.state] > 15 )
            {
                this.state = this.STATE.READY;
                this.level.destroy();
            }
        
        break;
    }
}
// </editor-fold>

HUD.prototype.updateResultScreen = function() // <editor-fold defaultstate="collapsed">
{    
    let one = 0;
    let ten = 0;
    let hundred = 0;
    let thousand = 0;
    
    // standard bricks
    one = this.resultCountStandard % 10;
    ten = Math.floor( this.resultCountStandard * 0.1 ) % 10;
    hundred = Math.floor( this.resultCountStandard * 0.01 ) % 10;
    
    this.result_standard_digit_1.gotoAndStop( hundred );
    this.result_standard_digit_2.gotoAndStop( ten );
    this.result_standard_digit_3.gotoAndStop( one );
    
    // golden bricks
    one = this.resultCountGolden % 10;
    ten = Math.floor( this.resultCountGolden * 0.1 ) % 10;
    hundred = Math.floor( this.resultCountGolden * 0.01 ) % 10;
    
    this.result_golden_digit_1.gotoAndStop( hundred );
    this.result_golden_digit_2.gotoAndStop( ten );
    this.result_golden_digit_3.gotoAndStop( one );
    
    // distance
    one = this.resultCountDistance % 10;
    ten = Math.floor( this.resultCountDistance * 0.1 ) % 10;
    hundred = Math.floor( this.resultCountDistance * 0.01 ) % 10;
    
    this.result_distance_digit_1.gotoAndStop( hundred );
    this.result_distance_digit_2.gotoAndStop( ten );
    this.result_distance_digit_3.gotoAndStop( one );
    
    // total
    this.resultCountTotal = this.resultCountStandard + this.resultCountGolden + this.resultCountDistance;
    one = this.resultCountTotal % 10;
    ten = Math.floor( this.resultCountTotal * 0.1 ) % 10;
    hundred = Math.floor( this.resultCountTotal * 0.01 ) % 10;
    thousand = Math.floor( this.resultCountTotal * 0.001 ) % 10;
    
    this.result_total_digit_1.gotoAndStop( thousand );
    this.result_total_digit_2.gotoAndStop( hundred );
    this.result_total_digit_3.gotoAndStop( ten );
    this.result_total_digit_4.gotoAndStop( one );
};
// </editor-fold>

HUD.prototype.playStandardBrickAudio = function( deltaTime ) // <editor-fold defaultstate="collapsed">
{
    this.standardBrickAudioDeltaTime += deltaTime;
    if ( this.standardBrickAudioDeltaTime < this.standardBrickAudioMinDeltaTime ) return;
    this.standardBrickAudioDeltaTime = 0;
    
    this.app.audio.play( "standard_brick_" + this.standardBrickSample, false, 0.5, this.standardBrickKeyTone * this.frequencies[ this.standardBrickMelody[ this.standardBrickMelodyPos ] ] );
    
    this.standardBrickSample++;
    if ( this.standardBrickSample > this.standardBrickSampleMax ) this.standardBrickSample = 0;
    
    this.standardBrickMelodyPos++;
    if ( this.standardBrickMelodyPos >= this.standardBrickMelodyLength ) this.standardBrickMelodyPos = 0;
}
// </editor-fold>

HUD.prototype.onResize = function() // <editor-fold defaultstate="collapsed">
{
    this.scale = this.app.stageH / 1920;
    this.halfWidth = this.app.stageW * 0.5;
    this.halfHeight = this.app.stageH * 0.5;
    
    // countdown
    this.countdown.x = this.halfWidth;
    this.countdown.y = this.halfHeight;
    this.countdown.scaleX = this.countdown.scaleY = this.scale;
    
    this.root.standard_bricks.y = 50 * this.scale;
    this.root.standard_bricks.scaleX = this.root.standard_bricks.scaleY = this.scale;// standard bricks
    this.root.standard_bricks.y = 50 * this.scale;
    this.root.standard_bricks.scaleX = this.root.standard_bricks.scaleY = this.scale;
    
    // golden bricks
    this.root.golden_bricks.x = this.app.stageW;
    this.root.golden_bricks.y = 50 * this.scale;
    this.root.golden_bricks.scaleX = this.root.golden_bricks.scaleY = this.scale;
    
    // distance
    this.root.distance.y = this.app.stageH - ( 200 + this.distance * 12 ) * this.scale;
    this.root.distance.scaleX = this.root.distance.scaleY = this.scale;
    
    // oneup
    this.oneup.x = this.oneup_posX * this.scale;
    this.oneup.x = this.oneup_posY * this.scale;
    this.oneup.scaleX = this.oneup.scaleY = this.scale * this.oneup_scale;
    
    // pause
    this.root.button_pause.x = this.app.stageW - 140 * this.scale;
    this.root.button_pause.y = this.app.stageH - 145 * this.scale;
    this.root.button_pause.scaleX = this.root.button_pause.scaleY = this.scale;

    // special items
    this.root.icon_magnet.x = this.halfWidth;
    this.root.icon_magnet.scaleX = this.root.icon_magnet.scaleY = this.scale;    
    this.root.icon_hourglass.x = this.halfWidth;
    this.root.icon_hourglass.scaleX = this.root.icon_hourglass.scaleY = this.scale;    
    this.root.icon_vehicle.x = this.halfWidth;
    this.root.icon_vehicle.scaleX = this.root.icon_vehicle.scaleY = this.scale;
    this.root.icon_golden_brick.x = this.halfWidth;
    this.root.icon_golden_brick.scaleX = this.root.icon_golden_brick.scaleY = this.scale;
    
    // result intro
    this.result_intro.x = this.halfWidth;
    this.result_intro.y = this.halfHeight;
    this.result_intro.scaleX = this.result_intro.scaleY = this.scale;
    
    // result screen
    this.result_screen.x = this.halfWidth;
    this.result_screen.y = this.halfHeight;
    this.result_screen.scaleX = this.result_screen.scaleY = this.scale;
    
    // result_buttons
    this.result_buttons.x = this.halfWidth;
    this.result_buttons.y = this.app.stageH - 360 * this.scale;
    this.result_buttons.scaleX = this.result_buttons.scaleY = this.scale;
    
    // golden ninjas
    if ( this.golden_ninjas )
    {
        this.golden_ninjas.x = this.halfWidth;
        this.golden_ninjas.y = 200 * this.scale;
        this.golden_ninjas.scaleX = this.golden_ninjas.scaleY = this.scale;
        
        this.root.game_complete.x = this.halfWidth;
        this.root.game_complete.y = this.halfHeight;
        this.root.game_complete.scaleX = this.root.game_complete.scaleY = this.scale;
    }
    
    // bg
    this.bg.style.width = this.app.stageW + "px";
    this.bg.style.height = this.app.stageH + "px";
};
// </editor-fold>

HUD.prototype.destroy = function() // <editor-fold defaultstate="collapsed">
{
    // remove from stage
    this.bg.remove();
    this.root.display.remove();
    FT.remove( this.root );

    for( let p in this )
    {
        this[ p ] = undefined;
    }
};
// </editor-fold>