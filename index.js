var router = require("./lib/node-http-route");

router.get("/test/", function(req, res) {
    res.sendText(200, "test");
});

router.get("/test/foo/", function(req, res) {
    res.sendText(200, "foo");
});

router.listen(8080, "127.0.0.1");
