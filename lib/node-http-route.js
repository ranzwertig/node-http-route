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
    , fs = require("fs")
    , sys = require("sys")
    , url = require("url");

var BODY404 = "NO ROUTE";

var debugMode = false;
var autoRedirect = true;

exports.setDebugMode = function (mode) {
    debugMode = mode;
};

exports.setAutoRedirect = function (redirect) {
    autoRedirect = redirect;
};

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
              [ 
              ["Content-Type", mime]
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
        if (autoRedirect && url.parse(req.url).pathname.charAt(url.parse(req.url).pathname.length - 1) !== "/") {  
            var query = url.parse(req.url).search || "";
            res.redirect(url.parse(req.url).pathname + "/" + query);
        }
        var pathHandler = handlerMethodMap[url.parse(req.url).pathname] || handle404;
        pathHandler(req, res);
    };
    
    handle(req, res)
});



exports.listen = function (port, host) {
  server.listen(port, host);
};

exports.close = function () { 
    server.close(); 
};

exports.streamFileHandler = function (file) {
    var   body
        , headers
        , mimeType
        , encoding;
    
    mimeType = mime.getMime(file);
    encoding = mimeType.slice(0, 4) === "text" ? "utf8" : "binary";
    
    var streamFileData = function (req, res, stats) {
        
        try {
            var stream = fs.createReadStream(file, {encoding : encoding});
        } 
        catch (err) {
            handle404(req, res);
            return;
        }
        
        headers = [
                  ["Content-Type", mimeType]
                , [ "Content-Length" , stats.size ]
                , ["Cache-Control", "public"]
        ];
        res.writeHead(200, headers);
              
        sys.pump(stream, res, function() {
        });
        
        req.connection.addListener('timeout', function() {
            if (stream.readable) {
                stream.destroy();
            }
        });
        
        stream.addListener('fd', function(fd) {
        });
        
        stream.addListener("error", function(error) {
            handle404(req, res);
        });
        
        res.addListener('error', function (error) {
            stream.destroy();
        });
        
    };
    
    return function (req, res) {
        fs.stat(file, function (err, stats) {
            streamFileData(req, res, stats); 
        });
        
    };    
};

exports.fileHandler = function (file) {
    var   body
        , headers
        , mimeType
        , encoding;
    
    mimeType = mime.getMime(file);
    encoding = mimeType.slice(0, 4) === "text" ? "utf8" : "binary";
    
    var getFileData = function (req, res, callback) {
        if (headers && body) {
            callback();
            return;
        }
        fs.readFile(file, encoding, function (err, data) {
            if (err) {
                handle404(req, res);
                return;
            }
            body = data;
            headers = [
                  [ "Content-Type", mimeType ]
                , [ "Content-Length" , body.length ]
                , ["Cache-Control", "public"]
            ];
            callback();
        });
        
    };
    
    return function (req, res) {
        getFileData(req, res, function () {
            res.writeHead(200, headers);
            if (req.method !== "HEAD")
                res.write(body, encoding);
            res.end();
        });
    };    
};

var mime = exports.mime = {
      DEFAULT : "application/octet-stream"
    , getExtensionMime : function (extension) {
        return mime.MIMES[extension.toLowerCase()] || mime.DEFAULT;
    }
    , getExtension : function (filename) {
        var index = filename.lastIndexOf(".");
        if (index < 0) return "";
        return filename.substring(index);
    }
    , getMime : function (filename) {
        var ext = mime.getExtension(filename);
        return mime.getExtensionMime(ext)
    }
    , MIMES : {
            ".3gp"   : "video/3gpp"
            , ".a"     : "application/octet-stream"
            , ".ai"    : "application/postscript"
            , ".aif"   : "audio/x-aiff"
            , ".aiff"  : "audio/x-aiff"
            , ".asc"   : "application/pgp-signature"
            , ".asf"   : "video/x-ms-asf"
            , ".asm"   : "text/x-asm"
            , ".asx"   : "video/x-ms-asf",
            , ".atom"  : "application/atom+xml"
            , ".au"    : "audio/basic"
            , ".avi"   : "video/x-msvideo"
            , ".bat"   : "application/x-msdownload"
            , ".bin"   : "application/octet-stream"
            , ".bmp"   : "image/bmp"
            , ".bz2"   : "application/x-bzip2"
            , ".c"     : "text/x-c"
            , ".cab"   : "application/vnd.ms-cab-compressed"
            , ".cc"    : "text/x-c"
            , ".chm"   : "application/vnd.ms-htmlhelp"
            , ".class"   : "application/octet-stream"
            , ".com"   : "application/x-msdownload"
            , ".conf"  : "text/plain"
            , ".cpp"   : "text/x-c"
            , ".crt"   : "application/x-x509-ca-cert"
            , ".css"   : "text/css"
            , ".csv"   : "text/csv"
            , ".cxx"   : "text/x-c"
            , ".deb"   : "application/x-debian-package"
            , ".der"   : "application/x-x509-ca-cert"
            , ".diff"  : "text/x-diff"
            , ".djv"   : "image/vnd.djvu"
            , ".djvu"  : "image/vnd.djvu"
            , ".dll"   : "application/x-msdownload"
            , ".dmg"   : "application/octet-stream"
            , ".doc"   : "application/msword"
            , ".dot"   : "application/msword"
            , ".dtd"   : "application/xml-dtd"
            , ".dvi"   : "application/x-dvi"
            , ".ear"   : "application/java-archive"
            , ".eml"   : "message/rfc822"
            , ".eps"   : "application/postscript"
            , ".exe"   : "application/x-msdownload"
            , ".f"     : "text/x-fortran"
            , ".f77"   : "text/x-fortran"
            , ".f90"   : "text/x-fortran"
            , ".flv"   : "video/x-flv"
            , ".for"   : "text/x-fortran"
            , ".gem"   : "application/octet-stream"
            , ".gemspec" : "text/x-script.ruby"
            , ".gif"   : "image/gif"
            , ".gz"    : "application/x-gzip"
            , ".h"     : "text/x-c"
            , ".hh"    : "text/x-c"
            , ".htm"   : "text/html"
            , ".html"  : "text/html"
            , ".ico"   : "image/vnd.microsoft.icon"
            , ".ics"   : "text/calendar"
            , ".ifb"   : "text/calendar"
            , ".iso"   : "application/octet-stream"
            , ".jar"   : "application/java-archive"
            , ".java"  : "text/x-java-source"
            , ".jnlp"  : "application/x-java-jnlp-file"
            , ".jpeg"  : "image/jpeg"
            , ".jpg"   : "image/jpeg"
            , ".js"    : "application/javascript"
            , ".json"  : "application/json"
            , ".log"   : "text/plain"
            , ".m3u"   : "audio/x-mpegurl"
            , ".m4v"   : "video/mp4"
            , ".man"   : "text/troff"
            , ".mathml"  : "application/mathml+xml"
            , ".mbox"  : "application/mbox"
            , ".mdoc"  : "text/troff"
            , ".me"    : "text/troff"
            , ".mid"   : "audio/midi"
            , ".midi"  : "audio/midi"
            , ".mime"  : "message/rfc822"
            , ".mml"   : "application/mathml+xml"
            , ".mng"   : "video/x-mng"
            , ".mov"   : "video/quicktime"
            , ".mp3"   : "audio/mpeg"
            , ".mp4"   : "video/mp4"
            , ".mp4v"  : "video/mp4"
            , ".mpeg"  : "video/mpeg"
            , ".mpg"   : "video/mpeg"
            , ".ms"    : "text/troff"
            , ".msi"   : "application/x-msdownload"
            , ".odp"   : "application/vnd.oasis.opendocument.presentation"
            , ".ods"   : "application/vnd.oasis.opendocument.spreadsheet"
            , ".odt"   : "application/vnd.oasis.opendocument.text"
            , ".ogg"   : "application/ogg"
            , ".p"     : "text/x-pascal"
            , ".pas"   : "text/x-pascal"
            , ".pbm"   : "image/x-portable-bitmap"
            , ".pdf"   : "application/pdf"
            , ".pem"   : "application/x-x509-ca-cert"
            , ".pgm"   : "image/x-portable-graymap"
            , ".pgp"   : "application/pgp-encrypted"
            , ".pkg"   : "application/octet-stream"
            , ".pl"    : "text/x-script.perl"
            , ".pm"    : "text/x-script.perl-module"
            , ".png"   : "image/png"
            , ".pnm"   : "image/x-portable-anymap"
            , ".ppm"   : "image/x-portable-pixmap"
            , ".pps"   : "application/vnd.ms-powerpoint"
            , ".ppt"   : "application/vnd.ms-powerpoint"
            , ".ps"    : "application/postscript"
            , ".psd"   : "image/vnd.adobe.photoshop"
            , ".py"    : "text/x-script.python"
            , ".qt"    : "video/quicktime"
            , ".ra"    : "audio/x-pn-realaudio"
            , ".rake"  : "text/x-script.ruby"
            , ".ram"   : "audio/x-pn-realaudio"
            , ".rar"   : "application/x-rar-compressed"
            , ".rb"    : "text/x-script.ruby"
            , ".rdf"   : "application/rdf+xml"
            , ".roff"  : "text/troff"
            , ".rpm"   : "application/x-redhat-package-manager",
            , ".rss"   : "application/rss+xml"
            , ".rtf"   : "application/rtf"
            , ".ru"    : "text/x-script.ruby"
            , ".s"     : "text/x-asm"
            , ".sgm"   : "text/sgml"
            , ".sgml"  : "text/sgml"
            , ".sh"    : "application/x-sh"
            , ".sig"   : "application/pgp-signature"
            , ".snd"   : "audio/basic"
            , ".so"    : "application/octet-stream"
            , ".svg"   : "image/svg+xml"
            , ".svgz"  : "image/svg+xml"
            , ".swf"   : "application/x-shockwave-flash"
            , ".t"     : "text/troff"
            , ".tar"   : "application/x-tar"
            , ".tbz"   : "application/x-bzip-compressed-tar"
            , ".tci"   : "application/x-topcloud"
            , ".tcl"   : "application/x-tcl"
            , ".tex"   : "application/x-tex"
            , ".texi"  : "application/x-texinfo"
            , ".texinfo" : "application/x-texinfo"
            , ".text"  : "text/plain"
            , ".tif"   : "image/tiff"
            , ".tiff"  : "image/tiff"
            , ".torrent" : "application/x-bittorrent"
            , ".tr"    : "text/troff"
            , ".ttf"   : "application/x-font-ttf"
            , ".txt"   : "text/plain"
            , ".vcf"   : "text/x-vcard"
            , ".vcs"   : "text/x-vcalendar"
            , ".vrml"  : "model/vrml"
            , ".war"   : "application/java-archive"
            , ".wav"   : "audio/x-wav"
            , ".wma"   : "audio/x-ms-wma"
            , ".wmv"   : "video/x-ms-wmv"
            , ".wmx"   : "video/x-ms-wmx"
            , ".wrl"   : "model/vrml"
            , ".wsdl"  : "application/wsdl+xml"
            , ".xbm"   : "image/x-xbitmap"
            , ".xhtml"   : "application/xhtml+xml"
            , ".xls"   : "application/vnd.ms-excel"
            , ".xml"   : "application/xml"
            , ".xpm"   : "image/x-xpixmap"
            , ".xsl"   : "application/xml"
            , ".xslt"  : "application/xslt+xml"
            , ".yaml"  : "text/yaml"
            , ".yml"   : "text/yaml"
            , ".zip"   : "application/zip"
    }
};


