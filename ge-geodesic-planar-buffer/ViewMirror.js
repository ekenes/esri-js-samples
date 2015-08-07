define(["esri/core/watchUtils"], 
  function( watchUtils){

  var ViewMirror = {

    startup: function(view1, view2){
     var viewRel = this._comparison(view1, view2);
     
     
        
     view1.then(function(){
      
       if(view1.type === "2d"){
         v1WatchExtent = watchUtils.pausable(view1, "extent", function(){
          var vp = view1.createViewpoint({
            center: view1.center,
            scale: view1.scale
          });
          view2.animateTo(vp);
         });
       
       v1WatchRotation = watchUtils.pausable(view1, "rotation", function(){
         var vp = view1.createViewpoint({
           center: view1.center,
           scale: view1.scale
         });
         view2.animateTo(vp);
       });  
      }   
         
      if(view1.type === "3d"){
        v1WatchCamera = watchUtils.pausable(view1, "camera", function(){
          var vp = view1.createViewpoint(view1.camera);
          view2.animateTo(vp); 
        });  
      }   
    
      watchUtils.when(view1, "interacting", function(){
        if(view1.animation)
          view1.animation.stop();
          
        if(typeof v1WatchExtent != "undefined"){
          v1WatchExtent.resume();
          v1WatchRotation.resume();    
        }
        if(typeof v1WatchCamera != "undefined"){
          v1WatchCamera.resume();
        }  
        if(typeof v2WatchExent != "undefined"){
          v2WatchExent.pause();
          v2WatchRotation.pause();
        }
        if(typeof v2WatchCamera != "undefined"){
          v2WatchCamera.pause();
        }
      });
   });
   
   view2.then(function(){
       
     if(view2.type === "3d"){
       v2WatchCamera = watchUtils.pausable(view2, "camera", function(){
        var vp = view2.createViewpoint(view2.camera);
        view1.animateTo(vp); 
      });   
     }
       
     if(view2.type === "2d"){
       v2WatchExtent = watchUtils.pausable(view2, "extent", function(){
          var vp = view2.createViewpoint({
            center: view2.center,
            scale: view2.scale
          });
          view1.animateTo(vp);
       });
       
       v2WatchRotation = watchUtils.pausable(view2, "rotation", function(){
         var vp = view2.createViewpoint({
           center: view2.center,
           scale: view2.scale
         });
         view1.animateTo(vp);
       });  
     }
 
     watchUtils.when(view2, "interacting", function(val){
        if(view2.animation)
          view2.animation.stop();
          
        if(typeof v2WatchExtent != "undefined"){
          v2WatchExtent.resume();
          v2WatchRotation.resume();    
        }
        if(typeof v2WatchCamera != "undefined"){
          v2WatchCamera.resume();
        }  
        if(typeof v1WatchExent != "undefined"){
          v1WatchExent.pause();
          v1WatchRotation.pause();
        }
        if(typeof v1WatchCamera != "undefined"){
          v1WatchCamera.pause();
        } 
     });
       
     view2.watch("animation", function(val, old){
         
         
         console.log("animation: ", val, " old: ", old);
     })
   });
        
        
        
  },
      
   _comparison: function(view1, view2){
       var comp = null;
       var v1Type = view1.type;
       var v2Type = view2.type;
       
       if (v1Type === "2d" && v2Type === "3d")
         comp = "map-scene";
       else if(v1Type === "3d" && v2Type === "2d")
         comp = "scene-map";
       else if(v1Type === "2d" && v2Type === "2d")
         comp = "map-map";
       else if(v1Type === "3d" && v2Type === "3d")
         comp = "scene-scene";
       else
          console.error("Invalid view type."); 
       
       return comp;  
   }
  };
    
  return ViewMirror;
});