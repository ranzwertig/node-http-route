/*
(The MIT License)

Copyright (c) 2010 Christian Ranz &lt;info@christianranz.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var   http = require("http")
    , readFile = require("fs")
    , sys = require("sys")
    , url = require("url");

var BODY404 = "NO ROUTE";

var mapper = {
      "GET" : {}
    , "HEAD": {}
    , "POST" : {}
    , "PUT" : {}
    , "DELETE" : {}
};

exports.get = function (route, pathHandler) {
    mapper.GET[route] = pathHandler;
};

exports.head = function (route, pathHandler) {
    mapper.HEAD[route] = pathHandler;
};

exports.post = function (route, pathHandler) {
    mapper.POST[route] = pathHandler;
};

exports.put = function (route, pathHandler) {
    mapper.PUT[route] = pathHandler;
};

exports.del = function (route, pathHandler) {
    mapper.DELETE[route] = pathHandler;
};

var handle404 = function (req, res) {
    res.writeHead(404, 
        {   
              "Content-Type": "text/plain"
            , "Content-Length": BODY404.length
        });
    res.end(BODY404);
};

var server = http.createServer(function (req, res) {
    
    res.redirect = function (location) {
        res.writeHead(302, {"Location": location});
        res.end();
    };
    
    res.relocate = function (location) {
        req.url = location;
        handle(req, res);
    };
    
    var sendRes = function (code, body, mime, headers) {
        res.writeHead(code, (headers || []).concat(
              [ ["Content-Type", mime]
            , ["Content-Length", Buffer.byteLength(body, 'utf8')]
        ]));
        if (req.method !== "HEAD")
            res.write(body, 'utf8');
        res.end();
    }
    
    res.sendText = function (code, body, headers) {
        sendRes(code, body, "text/plain", headers);
    };

    res.sendHtml = function (code, body, headers) {
        sendRes(code, body, "text/html", headers);
    };

    res.sendJson = function (code, json, headers) {
        sendRes(code, JSON.stringify(json), "application/json", headers);
    };
    
    var handle = function (req, res) {
        var handlerMethodMap = mapper[req.method];
        var pathHandler = handlerMethodMap[url.parse(req.url).pathname] || handle404;
        pathHandler(req, res);
    };
    
    handle(req, res);
});



exports.listen = function (port, host) {
  server.listen(port, host);
};

exports.close = function () { 
    server.close(); 
};

exports.staticFileHandler = function (req, res) {
    
};

var mime = exports.mime = {
      DEFAULT : "text/plain"
    , getExtensionMime : function (extension) {
        return mime.MIMES[extension.toLowerCase()] || mime.DEFAULT;
    }
    , getExtension : function (path) {
        var index = path.lastIndexOf(".");
        if (index < 0) return "";
        return path.substring(index);
    }
    , getMime : function (path) {
        var ext = mime.getExtension(path);
        return mime.getExtensionMime(ext)
    }
    , MIMES : {
          ".txt"   : "text/plain"
        , ".vcf"   : "text/x-vcard"
        , ".vcs"   : "text/x-vcalendar"
        , ".wav"   : "audio/x-wav"
        , ".wsdl"  : "application/wsdl+xml"
        , ".xml"   : "application/xml"
        , ".xsl"   : "application/xml"
        , ".xslt"  : "application/xslt+xml"
        , ".swf"   : "application/x-shockwave-flash"
        , ".rss"   : "application/rss+xml"
        , ".rdf"   : "application/rdf+xml"
        , ".png"   : "image/png"
        , ".pdf"   : "application/pdf"
        , ".pbm"   : "image/x-portable-bitmap"
        , ".mov"   : "video/quicktime"
        , ".mp3"   : "audio/mpeg"
        , ".mp4"   : "video/mp4"
        , ".mp4v"  : "video/mp4"
        , ".mpeg"  : "video/mpeg"
        , ".mpg"   : "video/mpeg"
        , ".m4v"   : "video/mp4"
        , ".json"  : "application/json"
        , ".jpeg"  : "image/jpeg"
        , ".jpg"   : "image/jpeg"
        , ".js"    : "application/javascript"
        , ".htm" : "text/html"
        , ".html" : "text/html"
    }
};


