var HotSpots = Class.create({
   initialize: function(spotData, container, options) {
       this.options = Object.extend(Object.extend({}, HotSpots.DefaultOptions), options || {});
       
       this.container = $(container);
       this.spotData = spotData;
       
       this.preloadImage();
              
       // set mode to normal
       this.mode = HotSpots.Modes.Normal;
   },
   
   preloadImage: function() {
       // preload the clicker
       this.clickerImage = $(new Image());
       this.clickerImage.src = this.options.clickerImage;
       this.clickerImage.observe("load", this.setup.bind(this));
   },
   
   setup: function() {
       // find the size of the clicker for centering purposes
       this.clickerSize = { x: this.clickerImage.width, y: this.clickerImage.height };
       
       this.spots = $A([]);
       
       // add the hot spots into the container
       this.spotData.each(function(spot) { 
           this.add(spot.x, spot.y, spot.href);
       }.bind(this));
       
       this.container.setStyle({ position: "relative" });
       this.container.observe("click", this.clickAdd.bindAsEventListener(this));
       
       this.setupEditor();
       
       // dispatch a load event after preload is done
       this.options.onLoad();
   },
   
   // normal text box editor
   setupNormalEditor: function() {
       this.hrefInput = new Element("input", { 'type': 'input', 'class': this.options.editorInputClass });              
   },
   
   // drop down editor that displays the ID's of usable zoomer content
   setupHTMLZoomerEditor: function() {
       // grab the html zoomer content boxes with the given class
       var contentElements = $$("." + this.options.zoomerContentClass);
       
       // create the select box
       this.hrefInput = new Element("select", { 'class': this.options.editorInputClass });
       
       // option for those with no href set
       this.hrefInput.appendChild(new Element("option", { 'value': "#" }).update("Please select..."));       
       
       contentElements.each(function(element) {
           var option = new Element("option", { 'value': "#" + element.id }).update(element.id);
           this.hrefInput.appendChild(option);
       }.bind(this))
   },
   
   setupEditor: function() {
       // create the editor box (opens when clicker is clicked on)

       // setup the editor based on the editor type chosen
       this["setup" + this.options.editorType + "Editor"]();
       
       this.saveButton = new Element("input", { 'type': 'button', 'value': 'Save', 'class': this.options.editorButtonClass });
       this.cancelButton = new Element("input", { 'type': 'button', 'value': 'Cancel', 'class': this.options.editorButtonClass });
       this.deleteButton = new Element("input", { 'type': 'button', 'value': 'Delete', 'class': this.options.editorButtonClass });
          
       this.editor = new Element("div", { 'class': this.options.editorClass });
       this.editor.setStyle({
           zIndex: this.options.clickerZIndex + 1,
           position: 'absolute',
           display: 'none'
       });

       this.editor.appendChild(this.hrefInput);
       this.editor.appendChild(this.saveButton);
       this.editor.appendChild(this.cancelButton);
       this.editor.appendChild(this.deleteButton);
       
       this.container.appendChild(this.editor);

       // save the new href value and hide the editor
       this.saveButton.observe('click', function() { 
           this.activeSpot.href = this.hrefInput.value;
           this.hideEditor();
       }.bind(this));       
       
       // closes the editor without saving
       this.cancelButton.observe('click', function() { this.hideEditor(); }.bind(this));
       
       // confirms deletion and delete hides the editor and removes the hot spot
       this.deleteButton.observe('click', function() {
           if (confirm("Are you sure?")) {
               this.activeSpot.remove();
               this.hideEditor();
           }
       }.bind(this));
   },
   
   hideEditor: function() {
       // no more active spot
       this.activeSpot = null;
       
       this.editor.hide();
   },
   
   openEditor: function(spot) {
       // set the active spot that is being edited
       this.activeSpot = spot;
       
       var x = spot.x + this.clickerSize.x / 2;
       var y = spot.y - this.clickerSize.y / 2;
       
       // set the position of the editor
       this.editor.setStyle({
           left: x + "px",
           top: y + "px"
       });
       
       this.editor.show();
       
       // if to right offscreen then reposition so it's visible
       if (x + this.editor.getWidth() > this.container.getWidth()) {
           x -= this.editor.getWidth() + this.clickerSize.x;
       }
       
       this.editor.setStyle({ left: x + "px" });
       
       this.hrefInput.focus();
       this.hrefInput.value = spot.href;
   },
   
   add: function(x, y, href) {
       this.spots.push(new HotSpots.Spot(x, y, href, this, this.options));
   },
   
   clickAdd: function(event) {
       // don't do click add if clicking on the editor
       if ($(event.target).descendantOf(this.editor) || event.target == this.editor) return;
       
       // if editing then don't add anything, but close the editor
       if (this.activeSpot) {
           this.hideEditor();
           return;
       }
       
       // only click add if in admin mode
       if (this.mode != HotSpots.Modes.Admin) return;
       
       var offset = this.container.cumulativeOffset();
       var position = [ event.pageX - offset[0], event.pageY - offset[1] ];
       
       this.add(position[0], position[1], "#");
       
       console.log(this.asJSON())
   },
   
   asJSON: function() {
       var temp = [];
       
       this.spots.each(function(spot) {
           temp.push(spot.asJSON());
       });
       
       return "[ " + temp.join(",\n") + " ]";
   }
});

HotSpots.Spot = Class.create({
    initialize: function(x, y, href, hotSpots, options) {
       this.options = Object.extend(Object.extend({}, HotSpots.DefaultOptions), options || {});
       this.hotSpots = hotSpots;
       
       this.setup(x, y, href);
    },
    
    setup: function(x, y, href) {    
        this.href = href;
        
        this.clickerImage = $(new Image());
        this.clickerImage.src = this.options.clickerImage;
        
        this.clicker = new Element("a", { href: href, 'class': this.options.clickerClass });
        this.clicker.appendChild(this.clickerImage);
        
        // center the position of the clicker based on it's size
        this.setPosition(x, y);
        
        // position it correctly
        this.clicker.setStyle({
            zIndex: this.options.clickerZIndex,
            position: "absolute",
            display: "block"
        });
        
        // add it to the specified containers
        this.hotSpots.container.appendChild(this.clicker);
        
        // stop the anchor from working
        this.clicker.observe("click", this.click.bindAsEventListener(this));
        
        this.clicker.observe("mousedown", this.mouseDown.bindAsEventListener(this));
        this.clicker.observe("mouseup", this.mouseUp.bindAsEventListener(this));
        this.hotSpots.container.observe("mousemove", this.mouseMove.bindAsEventListener(this));
    },
    
    setPosition: function(x, y) {
        this.x = x;
        this.y = y;
        
        // center the position of the clicker based on it's size
        x -= this.hotSpots.clickerSize.x / 2;
        y -= this.hotSpots.clickerSize.y / 2;
        
        // position it correctly
        this.clicker.setStyle({ left: x + "px", top: y + "px" });
    },
    
    click: function(event) {
        // only click add if in admin mode
        if (this.hotSpots.mode != HotSpots.Modes.Admin) return;
        
        // if the clicker was never dragged, then open the editor to edit
        if (!this.dragged) {
            this.hotSpots.openEditor(this);
        }
        
        event.stop();
    },
    
    mouseDown: function(event) {        
        this.dragged = false;

        // only click add if in admin mode
        if (this.hotSpots.mode != HotSpots.Modes.Admin) return;
                
        var offset = this.hotSpots.container.cumulativeOffset();
        var position = [ event.pageX - offset[0], event.pageY - offset[1] ];
        
        this.initialOffset = [ position[0] - this.x, position[1] - this.y ];
        
        this.canDrag = true;
        event.stop();
    },
    
    mouseMove: function(event) {
        // only click add if in admin mode
        if (this.hotSpots.mode != HotSpots.Modes.Admin) return;
        
        if (this.canDrag) {
            this.dragged = true;
        
            var offset = this.hotSpots.container.cumulativeOffset();
            var position = [ event.pageX - offset[0], event.pageY - offset[1] ];
            
            this.setPosition(position[0] - this.initialOffset[0], position[1] - this.initialOffset[1]);
        }
    },
    
    mouseUp: function(event) {
        // only click add if in admin mode
        if (this.hotSpots.mode != HotSpots.Modes.Admin) return;
        
        this.canDrag = false;
        event.stop();
    },
    
    asJSON: function() {
        return "{ " +
                   "x: " + this.x + ", " +
                   "y: " + this.y + ", " +
                   "href: '" + this.href + "' " +
               "}";
    },
    
    remove: function() {
        // deletes the clicker defined
        this.clicker.remove();
        this.hotSpots.spots = this.hotSpots.spots.without(this);
    }
})

// Enum for modes
HotSpots.Modes = {
    Admin: "Admin",
    Normal: "Normal"
};

// Enum for editors
HotSpots.Editors = {
    Normal: "Normal",
    HTMLZoomer: "HTMLZoomer"        // Use this for the drop down of HTML Zoomer ID's
};

HotSpots.DefaultOptions = {
    editorType: HotSpots.Editors.Normal,
    editorClass: "editor",
    editorInputClass: "editor-input",
    editorButtonClass: "editor-button",
    clickerZIndex: 200,
    clickerClass: "clicker",
    clickerImage: "/images/clicker.png",
    zoomerContentClass: "zoomer-content"    // Use this to define the class that the HTMLZoomer editor uses to grab ID's
};