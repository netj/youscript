// Generated by CoffeeScript 1.6.3
/* YouScript Bookmarklet Editor
# * Author: Jaeho Shin <netj@sparcs.org>
# * Created: 2011-08-16
*/


(function() {
  var afterIdle, afterIdleSecs, createNewGist, decode, decodeFromGist, decodeQueryString, doAfterSigningInToGithub, editor, encode, encodeHash, encodeQueryString, encodeToGist, exportCode, forkGist, gistIdFromQueryString, gistList, githubAPI, importCode, loadGist, loadGistsList, signInToGithub, signOutFromGithub, tasksAfterSignIn, unloadGist, updateContents, updateGist, updateUI,
    __slice = [].slice;

  editor = null;

  afterIdleSecs = 1;

  encode = function() {
    var bklet;
    bklet = "javascript:" + encodeURI(editor.getValue());
    $("#bookmarklet").val(bklet);
    return updateContents();
  };

  decode = function() {
    var bklet, js;
    bklet = this.value.trim();
    if (bklet === "javascript:" + encodeURI(editor.getValue())) {
      return;
    }
    js = decodeURI(bklet.replace(/^\s*javascript:\s*/i, ""));
    editor.setValue(js);
    return updateContents();
  };

  encodeHash = function(label, bklet, descr) {
    var hash;
    hash = "";
    hash += "label=" + encodeURIComponent(label);
    hash += "&";
    hash += "url=" + encodeURIComponent(bklet);
    hash += "&";
    hash += "description=" + encodeURIComponent(descr);
    location.hash = "#" + (typeof btoa !== "function" ? hash : hash.match(/%[8-9A-F][0-9A-F]/i) ? "base64," + (btoa(hash)) : hash);
    return console.log("encoded hash");
  };

  window.parseQueryString = function(querystring) {
    var args, nv, pair, _i, _len, _ref;
    args = {};
    _ref = querystring.split(/&/);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      pair = _ref[_i];
      nv = pair.split("=", 2);
      args[nv[0]] = decodeURIComponent(nv[1]);
    }
    return args;
  };

  window.decodeHash = function() {
    var args, hash, m;
    if (location.hash && location.hash.length > 1) {
      hash = location.hash.substring(1);
      if (m = hash.match(/^base64,(.*)$/)) {
        hash = atob(m[1]);
      }
      args = window.parseQueryString(hash);
      if (args.url != null) {
        $("#bookmarklet").val(args.url).change();
      }
      if (args.label != null) {
        $("#label").val(args.label).change();
      }
      if (args.description != null) {
        $("#description").val(args.description).change();
      }
      return args;
    }
  };

  updateContents = function() {
    var bklet, descr, label, nonemptyLabel, nonemptyTitle, title;
    bklet = $("#bookmarklet").val();
    label = $("#label").val();
    descr = $("#description").val();
    nonemptyLabel = label || "Example Bookmarklet";
    $("#bookmarklet-link").attr("href", bklet).text(nonemptyLabel);
    $("#navbar-bookmarklet-title").text(nonemptyLabel);
    $("#bookmarklet-description").text(descr);
    title = "" + ((label != null ? label.length : void 0) ? "" + label + " — " : "") + "YouScript";
    nonemptyTitle = "" + nonemptyLabel + " — YouScript";
    encodeHash(label, bklet, descr);
    document.title = title;
    return $("#link-to-editor").attr("href", location.href).text(nonemptyTitle);
  };

  afterIdle = function(handler) {
    return function() {
      var args,
        _this = this;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (this.afterIdleT != null) {
        this.afterIdleT = clearTimeout(this.afterIdleT);
      }
      return this.afterIdleT = setTimeout(function() {
        return handler.apply.apply(handler, [_this].concat(__slice.call(args)));
      }, afterIdleSecs * 1000);
    };
  };

  $(window).load(function() {
    var $win, navbarHeight;
    $("#label, #description").keyup(afterIdle(updateContents)).change(updateContents);
    $("#bookmarklet").keyup(afterIdle(decode)).change(decode);
    window.editor = editor = CodeMirror.fromTextArea($("#code")[0], {
      lineWrapping: true,
      lineNumbers: true,
      matchBrackets: true,
      onChange: afterIdle(encode),
      onBlur: encode
    });
    $("#clear").click(function(event) {
      editor.setValue("");
      $("#label, #description").val("");
      return encode();
    });
    navbarHeight = $(".navbar")[0].offsetHeight;
    $win = $(window);
    $(".nav a[href^='#']").each(function() {
      var jumpTo;
      jumpTo = $(this.getAttribute("href"))[0];
      return $(this).click(function(event) {
        $win.scrollTop(jumpTo.offsetTop - navbarHeight - 10);
        return event.preventDefault();
      });
    });
    return window.decodeHash();
  });

  gistList = $("#saved-pane ul");

  githubAPI = function(method, path, data, headers) {
    if (method == null) {
      method = "GET";
    }
    if (path == null) {
      path = "/";
    }
    if (data == null) {
      data = null;
    }
    if (headers == null) {
      headers = {};
    }
    if (localStorage.githubAccessToken) {
      if (headers.Authorization == null) {
        headers.Authorization = "token " + localStorage.githubAccessToken;
      }
    }
    return $.ajax({
      type: method,
      url: "https://api.github.com" + path,
      contentType: "application/json",
      processData: false,
      data: data != null ? JSON.stringify(data) : void 0,
      headers: headers,
      dataType: "json"
    });
  };

  exportCode = function(code) {
    return "/* Created with YouScript Bookmarklet Editor\n * http://netj.github.io/youscript/\n */\n\n" + code;
  };

  importCode = function(code) {
    var delim, frontmatter;
    delim = "\n\n";
    frontmatter = code.split(delim, 1)[0];
    return code.substring(frontmatter.length + delim.length);
  };

  encodeToGist = function(label, description, code) {
    var files, gist;
    files = {};
    files["bookmarklet.js"] = {
      content: exportCode(code)
    };
    return gist = {
      description: "" + (label.replace(/—/g, "——")) + " — " + description,
      files: files
    };
  };

  decodeFromGist = function(gist) {
    var code, description, isOwner, label, _ref, _ref1, _ref2;
    code = (_ref = gist.files) != null ? (_ref1 = _ref["bookmarklet.js"]) != null ? _ref1.content : void 0 : void 0;
    if (code != null) {
      code = importCode(code);
    }
    _ref2 = gist.description.split(" — ", 2), label = _ref2[0], description = _ref2[1];
    label = label.replace(/——/g, "—");
    isOwner = gist.user.login === localStorage.githubUserLogin;
    return [label, description, code, isOwner];
  };

  updateUI = function(label, description, code, isOwner) {
    var _ref;
    $(".current-gist-id").text((_ref = window.gist) != null ? _ref.id : void 0);
    if (code != null) {
      window.editor.setValue(code);
      window.editor.focus();
    }
    if (description != null) {
      $("#description").val(description).change();
    }
    if (label != null) {
      $("#label").val(label).change();
    }
    if (code != null) {
      $("#label").focus();
    }
    window.editor.focus();
    $("#update-gist").toggleClass("inactive", isOwner);
    $("#fork-gist").toggleClass("inactive", !isOwner);
    return $("#create-new-gist").addClass("inactive");
  };

  gistIdFromQueryString = function() {
    var args, qs;
    if (location.search && location.search.length > 1) {
      qs = location.search.substring(1);
      args = window.parseQueryString(qs);
      return args.gist;
    }
  };

  encodeQueryString = function() {
    var gistId;
    gistId = gistIdFromQueryString();
    if (gistId !== $("#gist-id").val()) {
      if ($("#gist-id").val()) {
        return location.href = "?gist=" + (encodeURIComponent($("#gist-id").val()));
      }
    }
  };

  decodeQueryString = function() {
    var gistId;
    gistId = gistIdFromQueryString();
    if (gistId != null) {
      return setTimeout(function() {
        return loadGist(gistId, function(label, description, code, isOwner) {
          var hashArgs;
          if ((hashArgs = window.decodeHash()) != null) {
            console.log("keeping populated values from hash");
            return updateUI(null, null, null, isOwner);
          } else {
            console.log("no hash, populating gist");
            return updateUI(label, description, code, isOwner);
          }
        });
      });
    }
  };

  loadGist = function(gistId, next) {
    if (next == null) {
      next = updateUI;
    }
    $("#gist-id").val(gistId);
    encodeQueryString();
    return githubAPI("GET", "/gists/" + gistId).success(function(gist) {
      window.gist = gist;
      console.log("loadGist", gist);
      return next.apply(null, decodeFromGist(gist));
    });
  };

  unloadGist = function() {
    $(".current-gist-id").text("");
    $("#update-gist").addClass("inactive");
    $("#fork-gist").addClass("inactive");
    return $("#create-new-gist").removeClass("inactive");
  };

  createNewGist = function() {
    var bookmarklet, gist;
    bookmarklet = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    gist = encodeToGist.apply(null, bookmarklet);
    if (gist["public"] == null) {
      gist["public"] = true;
    }
    return githubAPI("POST", "/gists", gist).success(function(newGist) {
      console.log("create", newGist);
      updateUI.apply(null, decodeFromGist(newGist));
      return setTimeout(loadGistsList, 1000);
    });
  };

  updateGist = function() {
    var bookmarklet, gist, id;
    bookmarklet = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    id = $(".current-gist-id").first().text();
    gist = encodeToGist.apply(null, bookmarklet);
    return githubAPI("PATCH", "/gists/" + id, gist).success(function(newGist) {
      console.log("update", newGist);
      updateUI.apply(null, decodeFromGist(newGist));
      return setTimeout(loadGistsList, 1000);
    });
  };

  forkGist = function() {
    var bookmarklet, gist, id;
    bookmarklet = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    id = $(".current-gist-id").first().text();
    gist = encodeToGist.apply(null, bookmarklet);
    return githubAPI("POST", "/gists/" + id + "/fork", gist).success(function(newGist) {
      console.log("fork", newGist);
      updateUI.apply(null, decodeFromGist(newGist));
      return setTimeout(loadGistsList, 1000);
    });
  };

  loadGistsList = function() {
    var handleListError;
    handleListError = function(err) {
      return signOutFromGithub();
    };
    githubAPI("GET", "/user").success(function(user) {
      return $("#githubSignInUser").text(user.login);
    }).fail(handleListError);
    return githubAPI("GET", "/gists").success(function(gists) {
      var gist, _i, _len, _ref;
      gistList.find("li").remove();
      for (_i = 0, _len = gists.length; _i < _len; _i++) {
        gist = gists[_i];
        if (((_ref = gist.files) != null ? _ref["bookmarklet.js"] : void 0) != null) {
          (function(gist) {
            var description, label, _ref1;
            console.log("list", gist);
            _ref1 = decodeFromGist(gist), label = _ref1[0], description = _ref1[1];
            return $("<li>").attr({
              title: "gist: " + gist.id
            }).append($("<a>").attr({
              href: "?gist=" + gist.id
            }).append($("<b>").text(label))).append("<br>").append($("<small>").text(description)).appendTo(gistList);
          })(gist);
        }
      }
      $("#githubSignInForm").remove();
      return $(".githubAuthRequired").addClass("signedIn");
    }).fail(handleListError);
  };

  tasksAfterSignIn = [];

  doAfterSigningInToGithub = function(next) {
    if (localStorage.githubAccessToken != null) {
      return setTimeout(next, 1);
    } else {
      return tasksAfterSignIn.push(next);
    }
  };

  signInToGithub = function(githubLogin, githubPassword) {
    return githubAPI("POST", "/authorizations", {
      scopes: ["gist"],
      note: "YouScript Bookmarklet Editor",
      note_url: "http://netj.github.io/youscript/"
    }, {
      Authorization: "basic " + (btoa("" + githubLogin + ":" + githubPassword))
    }).success(function(res) {
      var next, _i, _len;
      localStorage.githubAccessToken = res.token;
      for (_i = 0, _len = tasksAfterSignIn.length; _i < _len; _i++) {
        next = tasksAfterSignIn[_i];
        setTimeout(next, 1);
      }
      return tasksAfterSignIn = [];
    });
  };

  signOutFromGithub = function() {
    delete localStorage.githubAccessToken;
    return $(".githubAuthRequired").removeClass("signedIn");
  };

  $(window).load(function() {
    var doSignIn;
    doSignIn = function(event) {
      signInToGithub($("#githubLogin").val(), $("#githubPassword").val());
      return event.preventDefault();
    };
    $("#githubSignInForm").submit(doSignIn);
    $("#githubSignIn").click(doSignIn);
    $("#githubSignOut").click(signOutFromGithub);
    $("#load-gist").click(function(event) {
      return loadGist($("#gist-id").val());
    });
    $("#create-new-gist").click(function(event) {
      var code, descr, label;
      label = $("#label").val();
      descr = $("#description").val();
      code = window.editor.getValue();
      return createNewGist(label, descr, code);
    });
    $("#update-gist").click(function(event) {
      var code, descr, label;
      label = $("#label").val();
      descr = $("#description").val();
      code = window.editor.getValue();
      return updateGist(label, descr, code);
    });
    $("#fork-gist").click(function(event) {
      var code, descr, label;
      label = $("#label").val();
      descr = $("#description").val();
      code = window.editor.getValue();
      return forkGist(label, descr, code);
    });
    $("#clear").click(function(event) {
      return unloadGist();
    });
    doAfterSigningInToGithub(loadGistsList);
    return decodeQueryString();
  });

}).call(this);

/*
//@ sourceMappingURL=bookmarklet.map
*/
