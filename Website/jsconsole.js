(()=>{const o=!1,n=1e4;let e,t=[];function s(){const s=document.getElementById("jsrcs").src.split("?")[1];e.send("rbroadcaster"),e.send("d"+s),function o(){t.length>0&&(e.send(t.shift()),o())}(),o&&setInterval(()=>{e.send("k")},n)}function c(){console.warn("Remote Debugging socket closed.")}console.log("Using Remote Debugging with jsconsole.net"),["log","warn","error","info"].forEach(o=>{let n=console[o];console[o]=function(){var s;n.apply(console,arguments),s=o[0]+function(){return Array.from(arguments).map(o=>{try{"object"==typeof o&&(o=JSON.stringify(o))}catch(n){o="[object Object(couldn't be stringified)]"}return o}).join(", ")}.apply(null,arguments),e&&e.readyState===e.OPEN?e.send(s):t.push(s)}}),function(){let o="wss://",n="jsconsole.cap.jsconsole.net";"localhost"==window.location.hostname&&(o="ws://",n="localhost:5000"),(e=new WebSocket(o+n)).onopen=s,e.onclose=c}()})();