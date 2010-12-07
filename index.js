var router = require("./lib/node-http-route");

router.get("/test/", function(req, res) {
    res.sendText(200, "test");
});

router.get("/hello/", function(req, res) {
    res.sendText(200, "hello");
});

router.get("/foo/", function(req, res) {
    res.redirect("/hello/");
});

router.listen(8080, "127.0.0.1");
