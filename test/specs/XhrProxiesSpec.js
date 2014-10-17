describe("XHR Proxies", function () {
    var mockPromisesToResolveSynchronously = function () {
        spyOn(ayepromise, 'defer').and.returnValue(testHelper.synchronousDefer());
    };

    describe("finishNotifying", function () {
        describe("mocked XHR", function () {
            var callback, originalXHRInstance, xhrMockConstructor;

            var aXHRMockInstance = function () {
                var onloadHandler;
                return {
                    send: function () {},
                    addEventListener: function (event, handler) {
                        onloadHandler = handler;
                    },
                    mockDone: function () {
                        onloadHandler();
                    }
                };
            };

            beforeEach(function () {
                callback = jasmine.createSpy('callback');
                originalXHRInstance = [];
                xhrMockConstructor = function () {
                    var xhrMockInstance = aXHRMockInstance();
                    originalXHRInstance.push(xhrMockInstance);
                    return xhrMockInstance;
                };
            });

            it("should notify when a pending AJAX request has finished", function () {
                mockPromisesToResolveSynchronously();

                var finishNotifyingProxy = xhrproxies.finishNotifying(xhrMockConstructor),
                    xhr = finishNotifyingProxy();

                // Start XHR request
                xhr.send();

                finishNotifyingProxy.waitForRequestsToFinish().then(callback);

                expect(callback).not.toHaveBeenCalled();

                originalXHRInstance[0].mockDone();

                expect(callback).toHaveBeenCalledWith({totalCount: 1});
            });

            it("should notify when multipel pending AJAX request have finished", function () {
                mockPromisesToResolveSynchronously();

                var finishNotifyingProxy = xhrproxies.finishNotifying(xhrMockConstructor),
                    xhr1 = finishNotifyingProxy(),
                    xhr2 = finishNotifyingProxy();

                // Start XHR request
                xhr1.send();
                xhr2.send();

                finishNotifyingProxy.waitForRequestsToFinish().then(callback);

                originalXHRInstance[0].mockDone();
                expect(callback).not.toHaveBeenCalled();

                originalXHRInstance[1].mockDone();
                expect(callback).toHaveBeenCalledWith({totalCount: 2});
            });

            it("should handle an onload handler attached to the proxied instance", function (done) {
                var finishNotifyingProxy = xhrproxies.finishNotifying(xhrMockConstructor),
                    xhr = finishNotifyingProxy();

                xhr.onload = function myOwnOnLoadHandler() {};
                xhr.send();

                finishNotifyingProxy.waitForRequestsToFinish().then(done);

                originalXHRInstance[0].mockDone();
            });

            it("should finish when no XHR request has been started", function (done) {
                var finishNotifyingProxy = xhrproxies.finishNotifying(xhrMockConstructor);

                finishNotifyingProxy.waitForRequestsToFinish().then(done);
            });

            it("should notify even if called after all requests resovled", function (done) {
                var finishNotifyingProxy = xhrproxies.finishNotifying(xhrMockConstructor),
                    xhr = finishNotifyingProxy();

                xhr.send();
                originalXHRInstance[0].mockDone();

                finishNotifyingProxy.waitForRequestsToFinish().then(done);
            });
        });

        describe("integration", function () {
            it("should notify after file has loaded", function (done) {
                var callback = jasmine.createSpy('callback'),
                    FinishNotifyingProxy = xhrproxies.finishNotifying(window.XMLHttpRequest),
                    xhr = new FinishNotifyingProxy();

                xhr.onload = callback;
                xhr.open('GET', testHelper.fixturesPath + 'test.html', true);
                xhr.send(null);

                FinishNotifyingProxy.waitForRequestsToFinish().then(function (result) {
                    expect(callback).toHaveBeenCalled();
                    expect(result).toEqual({totalCount: 1});

                    done();
                });
            });
        });
    });

    describe("baseUrlRespecting", function () {
        describe("integration", function () {
            it("should load file relative to given base url", function (done) {
                var baseUrl = testHelper.fixturesPath,
                    BaseUrlRespectingProxy = xhrproxies.baseUrlRespecting(window.XMLHttpRequest, baseUrl),
                    xhr = new BaseUrlRespectingProxy();

                xhr.onload = function () {
                    expect(xhr.responseText).toMatch(/Test page/);
                    done();
                };
                xhr.open('GET', 'test.html', true);
                xhr.send(null);
            });
        });
    });
});
