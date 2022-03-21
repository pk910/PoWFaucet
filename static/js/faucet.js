(function() {
  var options = {
    powApiUrl: location.origin.replace(/^http/, "ws") + "/pow",
    minerSrc: "/js/powcaptcha-worker.js"
  };

  var container = document.querySelector(".pow-captcha");
  initPoWCaptcha(container, options);

})();