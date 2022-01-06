


function PreloadingScreen( app )
{
    // props
    this.app = app;
    
    this.STATE = 
    {
        INIT: 0,
        LOADING: 1,
        DONE: 2
    }
    this.state = this.STATE.INIT;
    
    this.display = AppUtils.createElement( "div", "PreloadingScreen" );
    AppUtils.setProps( this.display,
    {
        width: "0px",
        height: "0px"
    });
    
    this.bg = AppUtils.createElement( "div", "bg" );
    AppUtils.setProps( this.bg,
    {
        width: "1080px",
        height: "1920px",
        left: "-540px",
        top: "-960px",
        backgroundColor: "#000"
    });
    
    this.ninjago = AppUtils.createElement( "div", "ninjago" );
    AppUtils.setProps( this.ninjago,
    {
        width: "1000px",
        height: "800px",
        left: "-500px",
        top: "-400px",
        backgroundImage: "url('init/bg.png' )",
        animationName: "fadein",
        animationDuration: "1s"
    });
    
    this.loading = AppUtils.createElement( "div", "loading" );
    AppUtils.setProps( this.loading,
    {
        width: "172px",
        height: "51px",
        left: "-75px",
        top: "-25px",
        backgroundImage: "url( 'lang/" + this.app.language + "/init/loading.png' )",
        animationName: "fadein",
        animationDuration: "1s",
        animationFillMode: "backwards"
    });
    
    this.bar = AppUtils.createElement( "div", "bar" );
    AppUtils.setProps( this.bar,
    {
        width: "0px",
        height: "40px",
        left: "0px",
        top: "-46px",
        overflow: "hidden"
    });
    
    this.barImage = AppUtils.createElement( "div", "barImage" );
    AppUtils.setProps( this.barImage,
    {
        width: "424px",
        height: "40px",
        left: "0px",
        top: "0px",
        backgroundImage: "url('init/bar.png' )"
    });
    
    this.start = AppUtils.createElement( "div", "start" );
    AppUtils.setProps( this.start,
    {
        width: "226px",
        height: "64px",
        left: "-110px",
        top: "-20px",
        backgroundImage: "url( 'lang/" + this.app.language + "/init/start.png' )",
        opacity: "0",
        transformOrigin: "113px 32px"
    });
    
    this.display.append( this.bg );
    this.display.append( this.ninjago );
    this.bar.append( this.barImage );
    this.display.append( this.bar );
    this.display.append( this.loading );
    this.display.append( this.start );
    
    // set state
    this.state = this.STATE.LOADING;
}

PreloadingScreen.prototype.onProgress = function( progress )
{
    this.bar.style.width = ( 424 * progress ) + "px";
    this.bar.style.left = ( -214 * progress ) + "px";
}

PreloadingScreen.prototype.awaitInteraction = function()
{
    this.loading.style.animationName = "fadeout";
    this.loading.style.animationDuration = "0.2s";
    this.loading.style.animationFillMode = "forwards";

    this.start.style.animationName = "start_button";
    this.start.style.animationDuration = "0.5s";
    this.start.style.animationFillMode = "forwards";
}

PreloadingScreen.prototype.hide = function()
{
    this.state = this.STATE.DONE;
    this.display.style.display = "none";
}

PreloadingScreen.prototype.onResize = function()
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
    
    this.display.style.left = ( this.app.stageW * 0.5 ) + "px";
    this.display.style.top = ( this.app.stageH * 0.5 - 208 * scale ) + "px";
    this.display.style.transform = "scale( " + scale + ")";
}
