### YouScript Bookmarklet Editor
# * Author: Jaeho Shin <netj@sparcs.org>
# * Created: 2011-08-16
###

## editor
editor = null
afterIdleSecs = 1

encode = ->
  bklet = "javascript:" + encodeURI editor.getValue()
  $("#bookmarklet")
    .val(bklet)
  updateContents()

decode = ->
  bklet = this.value.trim()
  return if bklet == "javascript:" + encodeURI editor.getValue()
  js = decodeURI bklet.replace /^\s*javascript:\s*/i, ""
  editor.setValue(js)
  updateContents()

encodeHash = (label, bklet, descr) ->
  hash  = ""
  hash += "label="+ encodeURIComponent label
  hash += "&"
  hash += "url="  + encodeURIComponent bklet
  hash += "&"
  hash += "description="  + encodeURIComponent descr
  location.hash = "#" + (
    unless typeof btoa == "function" then hash
    else if hash.match /%[8-9A-F][0-9A-F]/i then "base64,#{btoa hash}"
    else hash
  )
  console.log "encoded hash"

window.parseQueryString = (querystring) ->
  args = {}
  for pair in querystring.split /&/
    nv = pair.split "=", 2
    args[nv[0]] = decodeURIComponent nv[1]
  args

window.decodeHash = ->
  if location.hash and location.hash.length > 1
    hash = location.hash.substring 1
    if m = hash.match /^base64,(.*)$/
      hash = atob m[1]
    args = window.parseQueryString hash
    $("#bookmarklet").val(args.url).change()         if args.url?
    $("#label").val(args.label).change()             if args.label?
    $("#description").val(args.description).change() if args.description?
    args

updateContents = ->
  bklet = $("#bookmarklet").val()
  label = $("#label").val()
  descr = $("#description").val()
  nonemptyLabel = label || "Example Bookmarklet"
  $("#bookmarklet-link")
    .attr("href", bklet)
    .text(nonemptyLabel)
  $("#navbar-bookmarklet-title")
    .text(nonemptyLabel)
  $("#bookmarklet-description")
    .text(descr)
  title = "#{if label?.length then "#{label} — " else ""}YouScript"
  nonemptyTitle = "#{nonemptyLabel} — YouScript"
  encodeHash label, bklet, descr
  document.title = title
  $("#link-to-editor")
    .attr("href", location.href)
    .text(nonemptyTitle)

afterIdle = (handler) -> (args...) ->
  this.afterIdleT = clearTimeout this.afterIdleT if this.afterIdleT?
  this.afterIdleT = setTimeout =>
      handler.apply this, args...
    , afterIdleSecs * 1000

$(window).load ->
  # setup UI
  $("#label, #description")
    .keyup(afterIdle updateContents)
    .change(updateContents)
  $("#bookmarklet")
    .keyup(afterIdle decode)
    .change(decode)
  window.editor = editor = CodeMirror.fromTextArea $("#code")[0],
    lineWrapping: true
    lineNumbers: true
    matchBrackets: true
    onChange: afterIdle encode
    onBlur: encode
  $("#clear").click (event) ->
    editor.setValue("")
    $("#label, #description")
      .val("")
    encode()

  # prevent navbar links from breaking location hash
  navbarHeight = $(".navbar")[0].offsetHeight
  $win = $(window)
  $(".nav a[href^='#']")
    .each( ->
      jumpTo = $(this.getAttribute "href")[0]
      #this.removeAttribute "href"
      $(this).click((event) ->
        $win.scrollTop(jumpTo.offsetTop - navbarHeight - 10)
        event.preventDefault()
      )
    )
  # load info from URL
  window.decodeHash()


## Gist storage
gistList = $("#saved-pane ul")

githubAPI = (method = "GET", path = "/", data = null, headers = {}) ->
  if localStorage.githubAccessToken
    headers.Authorization ?= "token #{localStorage.githubAccessToken}"
  $.ajax
    type: method
    url: "https://api.github.com#{path}"
    contentType: "application/json"
    processData: false
    data: if data? then JSON.stringify data
    headers: headers
    dataType: "json"

# add front matter comments with bookmarklet editor URL
exportCode = (code) ->
  """
  /* Created with YouScript Bookmarklet Editor
   * http://netj.github.com/youscript/
   */


  """ + code
importCode = (code) ->
  delim = "\n\n"
  [frontmatter] = code.split delim, 1
  code.substring (frontmatter.length + delim.length)

encodeToGist = (label, description, code) ->
  files = {}
  files["bookmarklet.js"] =
    content: exportCode code
  gist =
    description: "#{label.replace(/—/g, "——")} — #{description}"
    files: files

decodeFromGist = (gist) ->
  code = gist.files?["bookmarklet.js"]?.content
  # TODO fail unless code?
  code = importCode code if code?
  [label, description] = gist.description.split " — ", 2
  label = label.replace(/——/g, "—")
  isOwner = gist.user.login == localStorage.githubUserLogin
  
  [label, description, code, isOwner]

updateUI = (label, description, code, isOwner) ->
  $(".current-gist-id")
    .text(window.gist?.id)
  if code?
    window.editor.setValue(code)
    window.editor.focus()
  $("#description").val(description).change() if description?
  $("#label").val(label).change()    if label?
  if code?
    $("#label").focus()
  window.editor.focus()
  # action buttons
  $("#update-gist").toggleClass("inactive",  isOwner)
  $("#fork-gist"  ).toggleClass("inactive", !isOwner)
  $("#create-new-gist").addClass("inactive")


gistIdFromQueryString = ->
  if location.search and location.search.length > 1
    qs = location.search.substring 1
    args = window.parseQueryString qs
    args.gist

encodeQueryString = ->
  gistId = gistIdFromQueryString()
  unless gistId == $("#gist-id").val()
    location.href = "?gist=#{encodeURIComponent $("#gist-id").val()}" if $("#gist-id").val()

decodeQueryString = ->
  gistId = gistIdFromQueryString()
  if gistId?
    doAfterSigningInToGithub () ->
      loadGist gistId, (label, description, code, isOwner) ->
        if (hashArgs = window.decodeHash())?
          console.log "keeping populated values from hash"
          updateUI null, null, null, isOwner
        else
          console.log "no hash, populating gist"
          updateUI label, description, code, isOwner


loadGist = (gistId, next = updateUI) ->
  $("#gist-id").val(gistId)
  encodeQueryString()
  githubAPI("GET", "/gists/#{gistId}")
    .success (gist) ->
      window.gist = gist
      console.log "loadGist", gist
      next (decodeFromGist gist)...
    # TODO .fail ...

unloadGist = ->
  # disassociate gist
  $(".current-gist-id").text("")
  $("#update-gist").addClass("inactive")
  $("#fork-gist"  ).addClass("inactive")
  $("#create-new-gist").removeClass("inactive")

createNewGist = (bookmarklet...) ->
  gist = encodeToGist bookmarklet...
  gist.public ?= true # TODO private gist
  githubAPI("POST", "/gists", gist)
    .success (newGist) ->
      # get new gist ID from res and update UI
      console.log "create", newGist
      updateUI (decodeFromGist newGist)...
      # TODO add it directly to the list
      setTimeout loadGistsList, 1000
    # TODO .fail handleError

updateGist = (bookmarklet...) ->
  id = $(".current-gist-id").first().text()
  gist = encodeToGist bookmarklet...
  githubAPI("PATCH", "/gists/#{id}", gist)
    .success (newGist) ->
      console.log "update", newGist
      updateUI (decodeFromGist newGist)...
      setTimeout loadGistsList, 1000
    # TODO .fail handleError

forkGist = (bookmarklet...) ->
  id = $(".current-gist-id").first().text()
  gist = encodeToGist bookmarklet...
  githubAPI("POST", "/gists/#{id}/fork", gist)
    .success (newGist) ->
      # TODO Location: header
      console.log "fork", newGist
      updateUI (decodeFromGist newGist)...
      setTimeout loadGistsList, 1000
    # TODO .fail handleError

loadGistsList = () ->
  handleListError = (err) ->
    signOutFromGithub()
  githubAPI("GET", "/user")
    .success (user) ->
      $("#githubSignInUser")
        .text(user.login)
    .fail handleListError
  githubAPI("GET", "/gists")
    .success (gists) ->
      gistList.find("li").remove()
      for gist in gists when gist.files?["bookmarklet.js"]?
        do (gist) ->
          console.log "list", gist
          [label, description] = decodeFromGist gist
          $("<li>")
            .attr(title: "gist: #{gist.id}")
            .append(
              $("<a>")
                .attr(href: "?gist=#{gist.id}")
                .append($("<b>").text(label))
                #.click((event) ->
                #    loadGist gist.id
                #    event.preventDefault()
                #  )
            )
            .append("<br>")
            .append($("<small>").text(description))
            .appendTo(gistList)
      $("#githubSignInForm").remove()
      $(".githubAuthRequired").addClass("signedIn")
    .fail handleListError


tasksAfterSignIn = []
doAfterSigningInToGithub = (next) ->
  if localStorage.githubAccessToken?
    setTimeout next, 1
  else
    tasksAfterSignIn.push next

signInToGithub = (githubLogin, githubPassword) ->
  githubAPI "POST", "/authorizations",
        scopes:["gist"]
        note:"YouScript Bookmarklet Editor"
        note_url:"http://netj.github.com/youscript/"
      ,
        Authorization: "basic #{btoa("#{githubLogin}:#{githubPassword}")}"
    .success (res) ->
      localStorage.githubAccessToken = res.token
      setTimeout next, 1 for next in tasksAfterSignIn
      tasksAfterSignIn = []

signOutFromGithub = ->
  # TODO DELETE /authorizations/:id
  delete localStorage.githubAccessToken
  $(".githubAuthRequired").removeClass("signedIn")

$(window).load ->
  # sign in/out events
  doSignIn = (event) ->
    signInToGithub $("#githubLogin").val(), $("#githubPassword").val()
    event.preventDefault()
  $("#githubSignInForm").submit doSignIn
  $("#githubSignIn").click doSignIn
  $("#githubSignOut").click signOutFromGithub

  # load gist
  $("#load-gist").click (event) ->
    loadGist $("#gist-id").val()

  # create new gist
  $("#create-new-gist").click (event) ->
    label = $("#label").val()
    descr = $("#description").val()
    code = window.editor.getValue()
    createNewGist label, descr, code
  # update and fork gist
  $("#update-gist").click (event) ->
    label = $("#label").val()
    descr = $("#description").val()
    code = window.editor.getValue()
    updateGist label, descr, code
  $("#fork-gist").click (event) ->
    label = $("#label").val()
    descr = $("#description").val()
    code = window.editor.getValue()
    forkGist label, descr, code
  $("#clear").click (event) ->
    unloadGist()

  # load saved bookmarklets from GitHub gists
  doAfterSigningInToGithub loadGistsList

  # load Gist from URL
  decodeQueryString()

# vim:sw=2:sts=2:ft=coffee
