var globWidth;
var globHeight;
var current_game=null;
var stopped=true;
var loneThresh;
var overThresh;
var genMin;
var genMax;
var radius;
var timer;

$(document).ready(function () {
    
    $("#update_table").click(function(e) {
        e.preventDefault();
        
        globWidth = parseInt($("#width").val());
        
        if(isNaN(globWidth) || globWidth < 20 || globWidth > 200) {
            alert("Illegal width: " +$("width").val());
            return;
        }
        
        globHeight = parseInt($("#height").val());
        
        if(isNaN(globHeight) || globHeight < 20 || globHeight > 200) {
            alert("Illegal height: " +$("height").val());
            return;
        }
        
        if(current_game !=null){
            current_game.kill();
        }
        
        current_game = new table($("#game"), globWidth, globHeight);
        
    });
    
   $("#reset_button").click(function(e) {
        e.preventDefault();
        current_game.kill();
        current_game = new table($("#game"), globWidth, globHeight);
    });
    
    $("#step_button").click(function(e) {
        e.preventDefault();
        if(stopped){
            current_game.step();
        }
    });
    
    $("#random_button").click(function(e) {
        e.preventDefault();
        current_game.kill();
        current_game = new table($("#game"), globWidth, globHeight);
        current_game.randomize();
    });
    
    $("#start_button").click(function(e) {
        e.preventDefault();
        stopped=false;
        timer = window.setInterval(function(){current_game.step()},parseInt($("#speed").val()));
    });
    
    $("#stop_button").click(function(e) {
        e.preventDefault();
        window.clearInterval(timer);
        stopped=true;
    });
}); 

var table = function(table_div, width, height) {
    this.table_div = table_div;
    this.width = width;
    this.height = height;
    this.started = false;
    this.stopped = true;
    this.killed = false;
    this.spaces = new Array(height);
    
    table_div.css({position: "relative",
                   width: this.width*Space.WIDTH,
                   height: this.height*Space.HEIGHT});
    
    for(var y=0;y<this.height;y++) {
        this.spaces[y] = new Array(width);
        for(var x=0; x<this.width; x++) {
            var space = new Space(this, x, y);
            this.spaces[y][x] = space;
            table_div.append(space.getSpaceDiv());
        }
    }
};

table.prototype.kill = function(){
    this.table_div.empty();
    clearInterval(timer);
    stopped=true;
}

table.prototype.getSpace = function (x,y) {
    if((x<0) || (x>=this.width) || (y<0) || (y>=this.height)){
        return null;
    }
    return this.spaces[y][x];
}

var Space = function (table, x, y) {
    this.table = table;
    this.x = x;
    this.y = y;
    this.everalive = false;
    this.alive = false;
    this.setToKill = false;
    this.setToLive = false;
    
    this.space_div = $("<div></div>").css({position: "absolute",
                                           width: Space.WIDTH,
                                           height: Space.HEIGHT,
                                           top: y*Space.HEIGHT,
                                           left: x*Space.WIDTH});
    this.space_div.addClass("space");
    this.space_div.addClass("dead");
    
    var space = this;

    this.space_div.on('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    this.space_div.on('mousedown', function(e) {
        e.preventDefault();});
    
    
    this.space_div.click(function (e) {
        e.preventDefault();
        if((e.button==0)&&!e.shiftKey&&!e.altKey) {
            space.toggleClick();
        } else if ((e.button==0)&&e.shiftKey&&!e.altKey){
            space.liveClick();
        } else if ((e.button==0)&&!e.shiftKey&&e.altKey){
            space.killClick();
        }
    });
};

Space.WIDTH = 25;
Space.HEIGHT = 25;

Space.prototype.updateClasses = function(){
    if(this.alive){
        this.space_div.addClass("alive");
        this.space_div.addClass("everalive");
    } else {
        this.space_div.removeClass("alive");
    }
};

Space.prototype.toggleClick = function() {
    if(!this.alive) {
        this.alive = true;
        this.everalive = true;
    } else {
        this.alive= false;
    }
    this.updateClasses();
}

Space.prototype.liveClick = function() {
    this.alive = true;
    this.everalive = true;
    this.updateClasses();
}

Space.prototype.killClick = function() {
    this.alive = false;
    this.updateClasses();
}

Space.prototype.getSpaceDiv = function() {
    return this.space_div;
};

Space.prototype.getNeighbors = function() {
    var y_max = globHeight;
    var x_max = globWidth;
    
    var alive_count = 0;
    
    for(var ry = -radius; ry <= radius; ry++) {
            for(var rx = -radius; rx <= radius; rx++) {
                    if(((ry!=0) || (rx!=0)) && (this.table.isToroidal() || (((this.x+rx) >= 0) && ((this.x+rx) < x_max) && ((this.y+ry) >= 0) && ((this.y+ry) < y_max)))) {
                        var dx = ((this.x+x_max) + rx)%x_max;
                        var dy = ((this.y+y_max) + ry)%y_max;
                        
                        var n = current_game.getSpace(dx, dy);
                        if(n.alive){
                            alive_count++;
                        }
                } else if ((ry!=0) || (rx!=0)){
                    if(current_game.edgeAlive()) {
                        alive_count++;
                    }
                }
            }
    }
    return alive_count;
}

table.prototype.step = function() {
    if(this.checkSettings()){
        for(var i = 0; i < this.width; i++){
            for(var j = 0; j < this.height; j++) {
                var curSpace = this.getSpace(i,j);
                var alive_count = curSpace.getNeighbors();
                if(curSpace.alive){
                    if(alive_count < loneThresh || alive_count > overThresh){
                        curSpace.setToKill = true;
                    }
                } else {
                    if(alive_count >= genMin && alive_count <= genMax) {
                        curSpace.setToLive = true;
                    }
                }
            }
        }
        
        for(var i = 0; i < this.width; i++){
            for(var j = 0; j < this.height; j++) {
                var curSpace = this.getSpace(i,j);
                
                if(curSpace.setToKill){
                    curSpace.killClick();
                    curSpace.setToKill = false;
                } else if(curSpace.setToLive){
                    curSpace.liveClick();
                    curSpace.setToLive = false;
                }
            }
        }
    }
}

table.prototype.checkSettings = function() {
    loneThresh = parseInt($("#lonliness").val());
    overThresh = parseInt($("#Overpopulation").val());
    genMin = parseInt($("#GenMin").val());
    genMax = parseInt($("#GenMax").val());
    radius = parseInt($("#radius").val());
    
    if(isNaN(loneThresh) || loneThresh <= 0 || loneThresh > overThresh){
        alert("invalid Lonliness Threshold");
        return false;
    }
    if(isNaN(overThresh) || overThresh < loneThresh || overThresh >= ((4*radius*radius) + (4*radius))){
       alert("invalid Overpopulation Threshold");
        return false;
    }
    if(isNaN(genMin) || genMin <= 0 || genMin > genMax){
        alert("invalid Lonliness Threshold");
        return false;
    }
    if(isNaN(genMax) || genMax < genMin || genMax >= ((4*radius*radius) + (4*radius))){
       alert("invalid Overpopulation Threshold");
        return false;
    }
    return true;
}

table.prototype.isToroidal = function() {
    if($("#edgeCase").val() == "Toroidal"){
        return true;
    } else {
        return false;
    }
}

table.prototype.edgeAlive = function() {
    if($("#edgeCase").val() == "edgeAlive"){
        return true;
    } else {
        return false;
    }
}

table.prototype.randomize = function() {
    for(var i = 0; i < this.width; i++){
        for(var j = 0; j < this.height; j++) {
            if(Math.floor(Math.random()*100 + 1) <= 50){
                var randSpace = this.getSpace(i,j);
                randSpace.liveClick();
            }
        }
    }
}