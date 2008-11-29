// Options here are also parsed into all HotSpots objects

var HotSpotsPanorama = Class.create({
    initialize: function(panorama, options) {
        this.options = Object.extend(Object.extend({}, HotSpotsPanorama.DefaultOptions), options || {});
        
        // make sure the speed of the hot spots fading is the same as the panorama
        this.options.transitionSpeed = panorama.options.transitionSpeed;
        
        this.panorama = panorama;
        
        // grab the data name, and grab the hash of data from it
        this.dataName = this.options.dataName;
        this.data = eval(this.dataName);
        
        this.setup();
    },
    
    setup: function() {
        if (this.data == null) {
            this.data = {};
        }
        
        // setup on panorama change hook events to hook into hot spots
        this.panorama.options.onChange = this.show.bind(this);
        this.panorama.options.onHide = this.hide.bind(this);
        
        this.hotSpots = {};
        
        // setup a hotspot for each image in the panorama
        this.panorama.images.each(function(image) {
            var hotSpots = new HotSpots(this.data[image.src], this.panorama.container, this.options);
            
            // TEMP
            hotSpots.mode = HotSpots.Modes.Admin;
            
            this.hotSpots[image.src] = hotSpots;
            
            // only show hotspots from first panorama
            if (image != this.panorama.images.first()) hotSpots.quickHide();
        }.bind(this));
    },
    
    getCurrentHotSpots: function() {
        // exit if no current element
        if (!this.panorama.currentElement) return null;
        return this.hotSpots[this.panorama.currentElement.element.src];
    },
    
    show: function() {
        var hotSpots = this.getCurrentHotSpots();
        if (!hotSpots) return;
        hotSpots.show();
        
        console.log(this.asJSON())
    },
    
    hide: function() {
        var hotSpots = this.getCurrentHotSpots();
        if (!hotSpots) return;
        hotSpots.hide();
    },
    
    asJSON: function() {
        var hash = [];
        
        for (var src in this.hotSpots) {
            hash.push("'" + src + "'" + ": " + this.hotSpots[src].asJSON());
        }
        
        return "{ " + hash.join(', \n') + " }";
    }
});

HotSpotsPanorama.DefaultOptions = {
    dataName: "hotSpotsData"
};