var igv = (function (igv) {

    var maxViewportHeight = 400;

    igv.TrackView = function (track, browser) {

        this.browser = browser;
        this.track = track;
        this.order = track.order || 0;
        this.marginBottom = 10;

        var viewportHeight,
            viewportDiv,
            trackDiv,
            controlDiv,
            contentHeight,
            contentDiv,
            canvas,
            contentWidth,
            closeButton,
            labelButton,
            trackFilterButtonDiv,
            popup,
            rootObject = $(".igv-root-div");

        viewportHeight = track.height;

        // track
        trackDiv = document.createElement("div");
        browser.trackContainerDiv.appendChild(trackDiv);
        trackDiv.className = "igv-track-div";
        trackDiv.style.top = browser.rootHeight + "px";
        trackDiv.style.height = viewportHeight + "px";

        this.trackDiv = trackDiv;

        // controls
        controlDiv = document.createElement("div");
        trackDiv.appendChild(controlDiv);
        controlDiv.className = "igv-control-div";

        this.controlDiv = controlDiv;

        // if (browser.type === "GTEX") {
        var controlWidth = controlDiv.clientWidth;
        var controlHeight = controlDiv.clientHeight;

        var controlCanvas = document.createElement('canvas');
        controlDiv.appendChild(controlCanvas);
        controlCanvas.style.position = 'absolute';
        controlCanvas.style.width = controlWidth + "px";
        controlCanvas.style.height = controlHeight + "px";
        controlCanvas.setAttribute('width', controlWidth);
        controlCanvas.setAttribute('height', controlHeight);
        this.controlCanvas = controlCanvas;
        this.controlCtx = controlCanvas.getContext("2d");


        //    }

        // TODO - dat - this is so nothing breaks that is dependent on igv.controlPanelWidth
        igv.controlPanelWidth = controlDiv.clientWidth;

        // The viewport
        viewportDiv = document.createElement("div");
        trackDiv.appendChild(viewportDiv);
        viewportDiv.className = "igv-viewport-div";
        viewportDiv.style.left = controlDiv.clientWidth + "px";
        viewportDiv.style.height = viewportHeight + "px";

        this.viewportDiv = viewportDiv;

        // Content
        contentHeight = track.height;
        contentDiv = document.createElement("div");
        viewportDiv.appendChild(contentDiv);  // Note, must do this before getting width for canvas
        contentDiv.className = "igv-content-div";
        contentDiv.style.height = contentHeight + "px";
        this.contentDiv = contentDiv;

        contentWidth = contentDiv.clientWidth;

        canvas = document.createElement('canvas');
        contentDiv.appendChild(canvas);
        canvas.style.position = 'absolute';
        canvas.style.width = contentWidth + "px";
        canvas.style.height = contentHeight + "px";
        canvas.setAttribute('width', contentWidth);    //Must set the width & height of the canvas
        canvas.setAttribute('height', contentHeight);

        if (this.track.popupData) {
            this.track.popover = new igv.Popover(rootObject[0], this);
        }

        // filter  -- CURSOR only for now
        if (browser.type === "CURSOR") {

            this.track.cursorHistogram = new cursor.CursorHistogram(controlDiv.clientHeight, this.track.max);
            this.track.cursorHistogram.createMarkupWithTrackPanelDiv(this);
        }

        var nextButtonTop = 5;
        if (browser.type === "CURSOR") {

            var sortButton = document.createElement("i");
            controlDiv.appendChild(sortButton);
            sortButton.className = "fa fa-bar-chart-o";
            sortButton.style.color = "black";
            sortButton.style.position = "absolute";
            sortButton.style.top = nextButtonTop + "px";
            sortButton.style.left = "5px";
            sortButton.style.cursor = "pointer";
            nextButtonTop += 18;

            track.sortButton = sortButton;
            sortButton.onclick = function () {

                var spinner = igv.getSpinner(viewportDiv);   // Start a spinner
                // Delay 100 ms to give spinner a chance to spin up (we are single threaded)
                setTimeout(function () {
                    browser.cursorModel.sortRegions(track.featureSource, track.sortDirection, function (regions) {
                        spinner.stop();
                        browser.update();
                        track.sortDirection *= -1;

                    });
                }, 100);

                browser.trackPanels.forEach(function (trackView) {
                    if (track !== trackView.track) {
                        trackView.track.sortButton.className = "fa fa-bar-chart-o";
                        trackView.track.sortButton.style.color = "black";
                    }
                });

                sortButton.className = "fa fa-signal";
                sortButton.style.color = "red";

            };


            //
            trackFilterButtonDiv = document.createElement("div");
            controlDiv.appendChild(trackFilterButtonDiv);

            trackFilterButtonDiv.id = "filterButtonDiv_" + igv.guid();
            trackFilterButtonDiv.className = "igv-filter-histogram-button-div";
            trackFilterButtonDiv.style.top = nextButtonTop + "px";
            trackFilterButtonDiv.style.left = "5px";

            this.track.trackFilter = new igv.TrackFilter(this);
            this.track.trackFilter.createTrackFilterWidgetWithParentElement(trackFilterButtonDiv);

            nextButtonTop += 18;

        }

        // Close button
        if (!track.disableButtons) {

            closeButton = document.createElement("i");
            contentDiv.appendChild(closeButton);
            closeButton.style.color = "black";
            closeButton.className = "fa fa-times-circle";
            closeButton.style.position = "absolute";
            closeButton.style.top = "5px";
            closeButton.style.right = "5px";
            closeButton.style.cursor = "pointer";
            closeButton.onclick = function () {

                browser.removeTrack(track);

                // We removed a track. This removes it's filter. Must update filter chain application
                if (browser.type === "CURSOR") {
                    browser.cursorModel.filterRegions();
                }

            };

            if (track.label) {

                labelButton = document.createElement("button");
                viewportDiv.appendChild(labelButton);
                labelButton.className = "btn btn-xs btn-cursor-deselected";
                labelButton.style.position = "absolute";
                labelButton.style.top = "10px";
                labelButton.style.left = "10px";
                labelButton.innerHTML = track.label;
                track.labelButton = labelButton;

                labelButton.onclick = function () {

                    if (browser.cursorModel) {
                        track.featureSource.allFeatures(function (featureList) {

                            browser.referenceFrame.start = 0;
                            browser.cursorModel.setRegions(featureList);
//                        browser.update();


                        });


                        browser.trackPanels.forEach(function (trackView) {
                            if (track !== trackView.track) {
                                trackView.track.labelButton.className = "btn btn-xs btn-cursor-deselected";
                            }
                        });
                    }
                    labelButton.className = "btn btn-xs btn-cursor-selected";

                }


            }
        }


        browser.rootHeight += viewportHeight + this.marginBottom;

        browser.div.style.height = browser.rootHeight + 165 + "px";

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        addTrackHandlers(this);


    };

    igv.TrackView.prototype.resize = function () {
        var canvas = this.canvas,
            contentDiv = this.contentDiv,
            contentWidth = this.viewportDiv.clientWidth;
        //      contentHeight = this.canvas.getAttribute("height");  // Maintain the current height

        contentDiv.style.width = contentWidth + "px";      // Not sure why css is not working for this
        //  contentDiv.style.height = contentHeight + "px";

        canvas.style.width = contentWidth + "px";
        canvas.setAttribute('width', contentWidth);    //Must set the width & height of the canvas
        this.update();
    };

    igv.TrackView.prototype.setTrackHeight = function (newHeight) {

        var heightStr = newHeight + "px";
        this.track.height = newHeight;
        this.trackDiv.style.height = heightStr;
        // this.controlDiv.style.height = heightStr;
        // this.controlCanvas.style.height = heightStr;
        // this.controlCanvas.setAttribute("height", newHeight);
        this.viewportDiv.style.height = heightStr;
        this.contentDiv.style.height = heightStr;
        this.canvas.style.height = heightStr;
        this.canvas.setAttribute("height", newHeight);

        this.track.cursorHistogram.updateHeight(this.track, newHeight);

        this.update();
    };

    igv.TrackView.prototype.update = function () {
        this.tile = null;
        this.repaint();

    };

    igv.TrackView.prototype.repaint = function () {

        if (!this.track) {
            return;
        }

        var tileWidth,
            tileStart,
            tileEnd,
            spinner,
            buffer,
            startBP,
            endBP,
            panel,
            igvCanvas,
            chr,
            scale,
            refFrame,
            tileRefFrame;

        refFrame = this.browser.referenceFrame;
        chr = refFrame.chr;
        startBP = refFrame.start;
        endBP = startBP + refFrame.toBP(this.canvas.width);
        scale = refFrame.bpPerPixel;
        panel = this;

        if (!this.tile || !this.tile.containsRange(chr, startBP, endBP, scale)) {

            var contentDiv = this.contentDiv;

            buffer = document.createElement('canvas');
            buffer.width = 3 * this.canvas.width;
            buffer.height = this.canvas.height;
            igvCanvas = new igv.Canvas(buffer);

            tileWidth = Math.round(buffer.width * refFrame.bpPerPixel);
            tileStart = Math.max(0, Math.round(refFrame.start - tileWidth / 3));
            tileEnd = tileStart + tileWidth;


            spinner = igv.getSpinner(this.trackDiv);   // Start a spinner

            if (this.currentTask) {
                this.currentTask.abort();
            }
            this.currentTask = {
                canceled: false,
                abort: function () {
                    this.canceled = true;
                    if (this.xhrRequest) {
                        this.xhrRequest.abort();
                    }
                    spinner.stop();
                }

            };

            this.track.draw(igvCanvas, refFrame, tileStart, tileEnd, buffer.width, buffer.height, function (task) {


                    spinner.stop();

                    if (task) console.log(task.canceled);

                    if (!(task && task.canceled)) {
                        panel.tile = new Tile(chr, tileStart, tileEnd, scale, buffer);
                        panel.paintImage();
                    }
                },
                this.currentTask);

            if (this.track.paintControl) {

                var buffer2 = document.createElement('canvas');
                buffer2.width = this.controlCanvas.width;
                buffer2.height = this.controlCanvas.height;

                var bufferCanvas = new igv.Canvas(buffer2);

                this.track.paintControl(bufferCanvas, buffer2.width, buffer2.height);

                this.controlCtx.drawImage(buffer2, 0, 0);
            }


        }
        else {
            this.paintImage();
        }

    };

    igv.TrackView.prototype.paintImage = function () {

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.tile) {
            this.xOffset = Math.round((this.tile.startBP - this.browser.referenceFrame.start) / this.browser.referenceFrame.bpPerPixel);
            this.ctx.drawImage(this.tile.image, this.xOffset, 0);
            this.ctx.save();
            this.ctx.restore();
        }
    };

    igv.TrackView.prototype.tooltipText = function (mouseX, mouseY) {
        return "";
    };

    igv.TrackView.prototype.setSortButtonDisplay = function (onOff) {
        this.track.sortButton.style.color = onOff ? "red" : "black";
    };

    function Tile(chr, tileStart, tileEnd, scale, image) {
        this.chr = chr;
        this.startBP = tileStart;
        this.endBP = tileEnd;
        this.scale = scale;
        this.image = image;
    }

    Tile.prototype.containsRange = function (chr, start, end, scale) {
        var hit = this.scale == scale && start >= this.startBP && end <= this.endBP && chr === this.chr;
        return hit;
    };


    function addTrackHandlers(trackView) {

        var isMouseDown = false,
            lastMouseX = undefined,
            mouseDownX = undefined,
            referenceFrame = trackView.browser.referenceFrame,
            canvas = trackView.canvas,
            dragThreshold = 3,
            popupTimer = undefined,
            rootObject = $(".igv-root-div");

        canvas.onmousedown = function (e) {

            var canvasCoords = igv.translateMouseCoordinates(e, canvas);

            if (trackView.track.popover) {
                trackView.track.popover.hide();
            }

            isMouseDown = true;
            lastMouseX = canvasCoords.x;
            mouseDownX = lastMouseX;


        };

        canvas.onmousemove = igv.throttle(function (e) {

            var coords = igv.translateMouseCoordinates(e, canvas),
                pixels,
                pixelsEnd,
                viewPortWidth;

            if (isMouseDown) { // Possibly dragging

                if (mouseDownX && Math.abs(coords.x - mouseDownX) > dragThreshold) {

                    referenceFrame.shiftPixels(lastMouseX - coords.x);

                    // clamp left
                    referenceFrame.start = Math.max(0, referenceFrame.start);

                    // clamp right
                    if (trackView.browser.cursorModel) {

                        // CURSOR track clamping
                        viewPortWidth = $(".igv-viewport-div").first().width();
                        pixelsEnd = Math.floor( trackView.browser.cursorModel.framePixelWidth * trackView.browser.cursorModel.getRegionList().length );
                        pixels = Math.floor( trackView.browser.referenceFrame.toPixels( referenceFrame.start ) + viewPortWidth );

                        if (pixels >= pixelsEnd) {
                            referenceFrame.start = trackView.browser.referenceFrame.toBP( pixelsEnd - viewPortWidth);
                        }


                    }

                    trackView.browser.repaint();
                }

                lastMouseX = coords.x;

            }

        }, 20);


        canvas.onmouseup = function (e) {

            e = $.event.fix(e);   // Sets pageX and pageY for browsers that don't support them

            var canvasCoords = igv.translateMouseCoordinates(e, canvas);

            if (popupTimer) {
                // Cancel previous timer
                window.clearTimeout(popupTimer);
                popupTimer = undefined;
            }

            if (Math.abs(canvasCoords.x - mouseDownX) <= dragThreshold && trackView.track.popupData) {
                popupTimer = window.setTimeout(function () {

                        var rootX = e.pageX - rootObject.offset().left,
                            rootY = e.pageY - rootObject.offset().top,
                            popupData,
                            genomicLocation = Math.floor((referenceFrame.start) + referenceFrame.toBP(canvasCoords.x)),
                            xOrigin;

                        if (undefined === genomicLocation) {
                            return;
                        }

                        xOrigin = Math.round( referenceFrame.toPixels( (trackView.tile.startBP - referenceFrame.start) ));

                        popupData = trackView.track.popupData(genomicLocation, canvasCoords.x - xOrigin, canvasCoords.y);
                        if (popupData && popupData.length > 0) {
                            trackView.track.popover.show(rootX, rootY, igv.formatPopoverText(popupData));
                        }
                        mouseDownX = undefined;
                    },
                    500);
            }
            else {
                mouseDownX = undefined;
            }


            isMouseDown = false;
            lastMouseX = undefined;

        };

        canvas.onmouseout = function (e) {
            isMouseDown = false;
            lastMouseX = undefined;
            mouseDownX = undefined;
        };

        canvas.ondblclick = function (e) {

            e = $.event.fix(e);   // Sets pageX and pageY for browsers that don't support them

            var canvasCoords = igv.translateMouseCoordinates(e, canvas);

            if (popupTimer) {
                window.clearTimeout(popupTimer);
                popupTimer = undefined;

            }

            if (trackView.track.handleDblClick) {
                trackView.track.handleDblClick(dx, dy, trackView.viewportDiv);
            }
            else {
                var newCenter = Math.round(referenceFrame.start + canvasCoords.x * referenceFrame.bpPerPixel);
                referenceFrame.bpPerPixel /= 2;
                trackView.browser.goto(referenceFrame.chr, newCenter);
            }
        };

    }


    return igv;
})
(igv || {});
