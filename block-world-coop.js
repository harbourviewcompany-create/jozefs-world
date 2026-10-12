/* Classic 2D co-op helper. Positions are sent by the main game. */
(function(){
 window.BlockWorld2D=window.BlockWorld2D||{};
 if(!window.BlockWorld2D.onRemote){
  window.BlockWorld2D.onRemote=function(data){
   if(data&&data.t==='pos')window.BlockWorld2D.remote=data;
  };
 }
})();
