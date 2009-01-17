// Options here are also parsed into all HotSpots objects

var HotSpotsPanorama = Class.create({
    initialize: function(panorama, options) {
        this.options = Object.extend(Object.extend({}, HotSpotsPanorama.DefaultOptions), options || {});
        
        if (panorama.container == null) return;
        
        // make sure the speed of the hot spots fading is the same as the panorama
        this.options.transitionSpeed = panorama.options.transitionSpeed;
        
        this.panorama = panorama;
        
        // grab the data name, and grab the hash of data from it
        this.dataName = this.options.dataName;
        this.data = eval(this.dataName);
        
        this.setup();
    },
    
    changeMode: function(mode) {
        for (var id in this.hotSpots) {
            this.hotSpots[id].changeMode(mode);
        }
        
        this.mode = mode;
    },
    
    checkIfAdmin: function() {
        // if the below element exists, then we are in admin
        if ($(this.options.adminTestElement)) {
            this.changeMode(HotSpots.Modes.Admin);
        }
    },
    
    // This call lets hotspots know that image zoomer is used and needs to handle
    // the disabling of image zoomer in admin mode
    useImgZoomer: function(imgZoomer) {
        for (var id in this.hotSpots) {
            this.hotSpots[id].useImgZoomer(imgZoomer);
            
            // pause panorama if img zoomer is opened
            imgZoomer.options.onOpen = this.panorama.pause.bind(this.panorama);
            imgZoomer.options.onClose = this.panorama.unPause.bind(this.panorama);
        }
    },
    
    setup: function() {
        if (this.data == null) {
            this.data = {};
        }
        
        // setup on panorama change hook events to hook into hot spots
        this.panorama.options.onShow = this.show.bind(this);
        this.panorama.options.onHide = this.hide.bind(this);
        
        this.hotSpots = {};
        
        // setup a hotspot for each image in the panorama
        this.panorama.images.each(function(image) {
            var hotSpots = new HotSpots(this.data[image.id], this.panorama.container, this.options);
            
            this.hotSpots[image.id] = hotSpots;
            
            // only show hotspots from first panorama
            if (image != this.panorama.images.first()) hotSpots.quickHide();
            if (image == this.panorama.images.first() && !image.complete) hotSpots.quickHide();
                        
            hotSpots.editor.observe("mouseover", function() { this.ignoreOutputButton = true; }.bind(this));
            hotSpots.editor.observe("mouseout", function() { this.ignoreOutputButton = false; }.bind(this));
        }.bind(this));
        
        this.setupOutputTextArea();
        this.setupOutputButton();
        
        // update the output text area every 1 second
        // new PeriodicalExecuter(this.updateOutput.bind(this), 1);
    },
    
    updateOutput: function() {
        this.outputTextArea.value = this.asCode();
    },
    
    setupOutputButton: function() {
        // create the text area to output the code to
        this.outputButton = new Element("input", {
            'type': 'button',
            'class': this.options.outputButtonClass,
            'value': this.options.outputButtonText
        });
        
        this.outputButton.setStyle({
            position: "absolute",
            zIndex: this.options.outputButtonZIndex,
            display: 'none'
        });
        
        this.panorama.container.appendChild(this.outputButton);
        
        // make sure the button is shown after a time of mouse not moving
        $(document.body).observe("mousemove", this.mouseMove.bindAsEventListener(this));
        
        // if the user leaves the button then just hide it
        this.outputButton.observe("mouseout", function() {
            this.hideOutputButton();
        }.bind(this));
        
        // clicking on the button will show the JS code output
        this.outputButton.observe("click", this.showOutputTextArea.bind(this));
    },
    
    setupOutputTextArea: function() {
        // create the text area to output the code to
        this.outputTextArea = new Element("textarea", { 'class': this.options.outputTextAreaClass });
        
        this.outputTextArea.setStyle({
            opacity: this.options.outputTextAreaOpacity,
            position: "absolute",
            zIndex: this.options.outputTextAreaZIndex,
            display: 'none'
        });
        
        // create the button that will hide the output text area
        this.cancelButton = new Element("input", {
            'type': 'button',
            'class': this.options.cancelButtonClass,
            'value': this.options.cancelButtonText
        });
        
        this.cancelButton.setStyle({
            position: "absolute",
            zIndex: this.options.outputTextAreaZIndex,
            display: 'none'
        });
        
        // clicking on the cancel button hides the output text area
        this.cancelButton.observe("click", this.hideOutputTextArea.bind(this));
        
        this.panorama.container.appendChild(this.outputTextArea);
        this.panorama.container.appendChild(this.cancelButton);
    },
    
    showOutputTextArea: function() {
        if (this.mode != HotSpots.Modes.Admin) return;
        
        this.updateOutput();
        
        this.outputTextArea.show();
        this.cancelButton.show();
        this.hideOutputButton();
        
        // make sure if the text area is opened, then never show the output button again
        this.ignoreOutputButton = true;
    },
    
    hideOutputTextArea: function() {
        // we can show the button again
        this.ignoreOutputButton = false;
        
        this.outputTextArea.hide();
        this.cancelButton.hide();
    },
    
    mouseMove: function(event) {
        // provides the delay for the output button to show
        // if mouse doens't move for the set amount of time then show button
        clearTimeout(this.outputButtonShower);
        this.outputButtonShower = setTimeout(this.showOutputButton.bind(this, event), this.options.showOutputButtonDelay);
    },
    
    hideOutputButton: function() {
        // show the output button by fading it
        if (this.outputButtonEffect) this.outputButtonEffect.cancel();
        this.outputButtonEffect = new Effect.Fade(this.outputButton, { duration: this.options.outputButtonTransitionDelay });  
    },
    
    showOutputButton: function(event) {
        if (this.mode != HotSpots.Modes.Admin) return;
        
        // dont even attempt to show the button if it's set to be ignored
        if (this.ignoreOutputButton) return;
        
        // show the output button by fading it
        if (this.outputButtonEffect) this.outputButtonEffect.cancel();
        this.outputButtonEffect = new Effect.Appear(this.outputButton, { duration: this.options.outputButtonTransitionDelay });
        
        var offset = this.panorama.container.cumulativeOffset();
        var position = [ event.pageX - offset[0], event.pageY - offset[1] ];
        var buttonSize = [ this.outputButton.getWidth(), this.outputButton.getHeight() ];
        
        // positions the output button right where the mouse cursor is
        this.outputButton.setStyle({
            left: position[0] - buttonSize[0] / 2 + "px",
            top: position[1] - buttonSize[1] / 2 + "px"
        });
    },
    
    getCurrentHotSpots: function() {
        // exit if no current element
        if (!this.panorama.currentElement) return null;
        return this.hotSpots[this.panorama.currentElement.element.id];
    },
    
    show: function() {
        var hotSpots = this.getCurrentHotSpots();
        if (!hotSpots) return;
        hotSpots.show(true);
    },
    
    hide: function() {
        var hotSpots = this.getCurrentHotSpots();
        if (!hotSpots) return;
        hotSpots.hide();
    },
    
    asJSON: function() {
        var hash = [];
        
        for (var id in this.hotSpots) {
            hash.push("'" + id + "'" + ": " + this.hotSpots[id].asJSON());
        }
        
        return "{\n" + hash.join(', \n') + "\n}";
    },
    
    asCode: function() {
        return "<script type='text/javascript'>\n" +
               "var " + this.dataName + " = " + this.asJSON() + ";\n" + 
               "</script>";
    }
});

HotSpotsPanorama.DefaultOptions = {
    dataName: "hotSpotsData",
    
    cancelButtonClass: "cancel-button",
    cancelButtonText: "Close",    
    
    outputButtonClass: "output-button",
    outputButtonZIndex: 202,
    outputButtonText: "View JavaScript Code",
    outputButtonTransitionDelay: 0.25,
    showOutputButtonDelay: 2000,
    
    outputTextAreaClass: "output",
    outputTextAreaZIndex: 202,
    outputTextAreaOpacity: 0.8,
    
    adminTestElement: "bse_edit_mode"
};