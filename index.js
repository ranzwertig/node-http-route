var router = require("./lib/node-http-route");

router.get("/test/file/", router.fileHandler("index.js"));
router.get("/test/stream/", router.streamFileHandler("index.js"));

router.get("/test/foo/", function(req, res) {
    res.sendText(200, "foo");
});

router.get("/test/", function(req, res) {
    res.sendText(200, "test");
});

router.listen(8080, "127.0.0.1");
