(function() {

  var root = (typeof exports == 'undefined' ? window : exports);

  var config = {
    // Ensure Content-Type is an image before trying to load @2x image
    // https://github.com/imulus/retinajs/pull/45)
    check_mime_type: true
  };

  root.Retina = Retina;

  function Retina() {}

  Retina.configure = function(options) {
    if (options == null) options = {};
    for (var prop in options) config[prop] = options[prop];
  };

  Retina.init = function(context) {
    if (context == null) context = root;

    var existing_onload = context.onload || new Function;

    context.onload = function() {
      var images = document.getElementsByTagName("img"), retinaImages = [], i, image;
      for (i = 0; i < images.length; i++) {
        image = images[i];
        retinaImages.push(new RetinaImage(image));
      }
      existing_onload();
    }
  };

  Retina.isRetina = function(){
    var mediaQuery = "(-webkit-min-device-pixel-ratio: 1.5),\
                      (min--moz-device-pixel-ratio: 1.5),\
                      (-o-min-device-pixel-ratio: 3/2),\
                      (min-resolution: 1.5dppx)";

    if (root.devicePixelRatio > 1)
      return true;

    if (root.matchMedia && root.matchMedia(mediaQuery).matches)
      return true;

    return false;
  };


  root.RetinaImagePath = RetinaImagePath;

  function RetinaImagePath(path, at_2x_path) {
    this.path = path;
    if( typeof at_2x_path !== "undefined" && at_2x_path !== null ) {
    	this.at_2x_path = at_2x_path;
    	this.perform_check = false;
    }else{
    	this.at_2x_path = path.replace(/\.\w+$/, function(match) { return "@2x" + match; });
    	this.perform_check = true;
    }
  }

  var scheduled,
    scheduleSave,
    doSave;

  if (localStorage) {
    if (localStorage.retinajs_confirmed_paths) {
      try {
        RetinaImagePath.confirmed_paths = JSON.parse(localStorage.retinajs_confirmed_paths);
      } catch (ex) {
        RetinaImagePath.confirmed_paths = {};
      }
    } else {
      RetinaImagePath.confirmed_paths = {};
    }
    if (localStorage.retinajs_skip_paths) {
      try {
        RetinaImagePath.skip_paths = JSON.parse(localStorage.retinajs_skip_paths);
      } catch (ex) {
        RetinaImagePath.skip_paths = {};
      }
    } else {
      RetinaImagePath.skip_paths = {};
    }
    scheduled = false;
    scheduleSave = function scheduleSaveFunc() {
      if (!scheduled) {
        scheduled = true;
        setTimeout(doSave, 10);
      }
    };
    doSave = function doSaveFunc() {
      if (localStorage) {
        try {
          localStorage.retinajs_confirmed_paths = JSON.stringify(RetinaImagePath.confirmed_paths);
          localStorage.retinajs_skip_paths = JSON.stringify(RetinaImagePath.skip_paths);
        } catch (ex) {
          scheduleSave = doSave = function(){};
        }
      }
      scheduled = false;
    };
  } else {
    RetinaImagePath.confirmed_paths = {};
    RetinaImagePath.skip_paths = {};
    scheduleSave = doSave = function(){};
  }

  RetinaImagePath.prototype.is_external = function() {
    return !!(this.path.match(/^https?\:/i) && !this.path.match('//' + document.domain) )
  }

  RetinaImagePath.prototype.check_2x_variant = function(callback) {
    var http, that = this;
    if (this.is_external()) {
      return callback(false);
    } else if (RetinaImagePath.skip_paths[this.at_2x_path]) {
      return callback(false);
    } else if (RetinaImagePath.confirmed_paths[this.at_2x_path]) {
      return callback(true);
    } else {
      http = new XMLHttpRequest;
      http.open('HEAD', this.at_2x_path);
      http.onreadystatechange = function() {
        if (http.readyState != 4) {
          return callback(false);
        }

        if (http.status >= 200 && http.status <= 399) {
          if (config.check_mime_type) {
            var type = http.getResponseHeader('Content-Type');
            if (type == null || !type.match(/^image/i)) {
              RetinaImagePath.skip_paths[that.at_2x_path] = 1;
              scheduleSave();
              return callback(false);
            }
          }

          RetinaImagePath.confirmed_paths[that.at_2x_path] = 1;
          scheduleSave();
          return callback(true);
        } else {
          RetinaImagePath.skip_paths[that.at_2x_path] = 1;
          scheduleSave();
          return callback(false);
        }
      }
      http.send();
    }
  }

  function RetinaImage(el) {
    this.el = el;
    this.path = new RetinaImagePath(this.el.getAttribute('src'), this.el.getAttribute('data-at2x'));
    var that = this;
    this.path.check_2x_variant(function(hasVariant) {
      if (hasVariant) that.swap();
    });
  }

  root.RetinaImage = RetinaImage;

  RetinaImage.prototype.swap = function(path) {
    if (typeof path == 'undefined') path = this.path.at_2x_path;

    var that = this;
    function load() {
      if (! that.el.complete) {
        setTimeout(load, 5);
      } else {
        that.el.setAttribute('width', that.el.offsetWidth);
        that.el.setAttribute('height', that.el.offsetHeight);
        that.el.setAttribute('src', path);
      }
    }
    load();
  }

  if (Retina.isRetina()) {
    Retina.init(root);
  }

})();
