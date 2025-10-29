(function() {
    try {
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        window.debounce = debounce;

        let effectsContainer = document.querySelector('.effects-container');
        if (!effectsContainer) {
            effectsContainer = document.createElement('div');
            effectsContainer.className = 'effects-container';
            document.body.appendChild(effectsContainer);
        }
        Object.assign(effectsContainer.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            zIndex: "-1",
            overflow: "hidden"
        });

        let currentTheme = localStorage.getItem('selectedTheme') || 'dark';
        let currentDotSpeed = localStorage.getItem('selectedDotSpeed') || 'normal';
        let currentDensity = localStorage.getItem('effectDensity') || 'high';
        let particles = [];
        let isActive = document.visibilityState === 'visible';

        const speedConfigs = {
            slow: { min: 5, max: 10 },
            normal: { min: 2, max: 7 },
            fast: { min: 1, max: 3 }
        };

        const densityConfigs = {
            low: { dot: 30, sparkle: 10, comet: 2, star: 4000 },
            medium: { dot: 50, sparkle: 20, comet: 5, star: 3400 },
            high: { dot: 100, sparkle: 40, comet: 10, star: 2800 }
        };

        const themes = {
            dark: "linear-gradient(to bottom, #000000, #0a0a0a, #111111, #1a1a1a, #222222)",
            night: "black",
            og: "radial-gradient(ellipse at center, #000000, #0a0a0a, #111111, #1a1a1a, #222222)",
            fortnite: { video: "https://dl.dropboxusercontent.com/s/abc456/fortnite_trailer_2025.mp4", youtube: "https://www.youtube.com/watch?v=kDP0BrvBqt0" }
        };

        function createParticle(type) {
            const particle = document.createElement("div");
            particle.className = type;
            const config = speedConfigs[currentDotSpeed];
            const duration = config.min + Math.random() * (config.max - config.min);
            Object.assign(particle.style, {
                left: `${Math.random() * 100}vw`,
                top: `${Math.random() * 100}vh`,
                animationDuration: `${duration}s`
            });
            return particle;
        }

        function createComet() {
            const comet = document.createElement("div");
            comet.className = "comet";
            const startPos = { x: Math.random() * 100, y: Math.random() * 100 };
            const angle = Math.random() * 360;
            const distance = 20 + Math.random() * 130;
            const endX = startPos.x + Math.cos(angle * Math.PI / 180) * distance;
            const endY = startPos.y + Math.sin(angle * Math.PI / 180) * distance;
            const duration = 5 + Math.random() * 5;
            Object.assign(comet.style, {
                left: `${startPos.x}vw`,
                top: `${startPos.y}vh`,
                animationDuration: `${duration}s`,
                "--start-x": `${startPos.x}vw`,
                "--start-y": `${startPos.y}vh`,
                "--end-x": `${endX}vw`,
                "--end-y": `${endY}vh`,
                zIndex: "100"
            });
            return comet;
        }

        function createShootingStar() {
            const star = document.createElement("div");
            star.className = "shooting-star";
            const startPos = { x: Math.random() * 100, y: Math.random() * 100 };
            const angle = Math.random() * 360;
            const distance = 20 + Math.random() * 130;
            const endX = startPos.x + Math.cos(angle * Math.PI / 180) * distance;
            const endY = startPos.y + Math.sin(angle * Math.PI / 180) * distance;
            const duration = 2.5 + Math.random() * 1;
            Object.assign(star.style, {
                left: `${startPos.x}vw`,
                top: `${startPos.y}vh`,
                animationDuration: `${duration}s`,
                "--start-x": `${startPos.x}vw`,
                "--start-y": `${startPos.y}vh`,
                "--end-x": `${endX}vw`,
                "--end-y": `${endY}vh`,
                zIndex: "100"
            });
            return star;
        }

        function updateEffects() {
            if (!effectsContainer || !isActive) return;

            const performanceMode = localStorage.getItem('performanceMode') === 'true';
            if (performanceMode) {
                particles.forEach(p => p.element.remove());
                particles = [];
                return;
            }

            particles.forEach(p => p.element.remove());
            particles = [];

            const config = densityConfigs[currentDensity];
            const isMobile = window.innerWidth < 768;
            const dotCount = isMobile ? Math.floor(config.dot * 0.6) : config.dot;
            const sparkleCount = isMobile ? Math.floor(config.sparkle * 0.6) : config.sparkle;
            const cometCount = isMobile ? Math.floor(config.comet * 0.6) : config.comet;

            for (let i = 0; i < dotCount; i++) {
                const dot = createParticle("dot");
                effectsContainer.appendChild(dot);
                particles.push({ element: dot, type: "dot" });
            }

            for (let i = 0; i < sparkleCount; i++) {
                const sparkle = createParticle("sparkle");
                effectsContainer.appendChild(sparkle);
                particles.push({ element: sparkle, type: "sparkle" });
            }

            for (let i = 0; i < cometCount; i++) {
                const comet = createComet();
                effectsContainer.appendChild(comet);
                particles.push({ element: comet, type: "comet" });
                comet.addEventListener('animationend', () => comet.remove());
            }
        }

        function extractYouTubeId(url) {
            try {
                const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
                const match = url.match(regex);
                return match ? match[1] : null;
            } catch (e) {
                return null;
            }
        }

        function isValidVideoUrl(url) {
            try {
                return url.match(/\.(mp4|webm|ogg)$/i);
            } catch (e) {
                return false;
            }
        }

     // effects.js (relevant section)
    function preloadVideo(url) {
       const link = document.createElement('link');
       link.rel = 'preload';
       link.href = url;
       link.setAttribute('as', 'video'); // Specify the resource type
       document.head.appendChild(link);
    }


    function initEffects() {
        // Initialize effects, including preloading
        // Removed preloadVideo('video.mp4') as it's not a real asset
        setTheme('dark');
        setDotSpeed(currentDotSpeed);
        setEffectDensity(currentDensity);
        window.addEventListener('resize', debounce(updateEffects, 250));

        let spawnTimeout;
        function spawnStarWithRandomInterval() {
            if (!isActive || localStorage.getItem('performanceMode') === 'true') return;
            const star = createShootingStar();
            effectsContainer.appendChild(star);
            star.addEventListener('animationend', () => star.remove());
            const nextSpawn = densityConfigs[currentDensity].star + Math.random() * 3000;
            spawnTimeout = setTimeout(spawnStarWithRandomInterval, nextSpawn);
        }

        if (isActive && localStorage.getItem('performanceMode') !== 'true') {
            spawnStarWithRandomInterval();
        }

        document.addEventListener('visibilitychange', () => {
            isActive = document.visibilityState === 'visible';
            if (isActive && localStorage.getItem('performanceMode') !== 'true') {
                updateEffects();
                spawnStarWithRandomInterval();
            } else {
                clearTimeout(spawnTimeout);
                particles.forEach(p => p.element.remove());
                particles = [];
            }
        });

        window.addEventListener('beforeunload', () => {
            isActive = false;
            clearTimeout(spawnTimeout);
        });
    }

    // Consolidated to single initialization path - removed duplicate DOMContentLoaded listener

        function setTheme(theme) {
            try {
                currentTheme = theme;
                localStorage.setItem('selectedTheme', theme);

                let background = document.querySelector('.background');
                if (!background) {
                    background = document.createElement('div');
                    background.className = 'background';
                    background.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2;';
                    document.body.appendChild(background);
                }

                const cachedBgStyle = localStorage.getItem('cachedBgStyle');
                if (cachedBgStyle && theme !== 'custom' && themes[theme] === cachedBgStyle) {
                    document.documentElement.style.setProperty('--theme-background', cachedBgStyle);
                }

                const existingVideo = background.querySelector('video, iframe');
                if (existingVideo) {
                    existingVideo.remove();
                }

                let bgStyle = themes.og;
                document.documentElement.style.setProperty('--theme-background', bgStyle);
                const defaultVideo = 'https://dl.dropboxusercontent.com/s/abc456/fortnite_trailer_2025.mp4';
                preloadVideo(defaultVideo);

                if (theme === 'custom') {
                    const customColor = localStorage.getItem('customBgColor') || '#000000';
                    const customGradient = localStorage.getItem('customGradient') || '';
                    let customVideoUrl = localStorage.getItem('customVideoUrl') || defaultVideo;
                    preloadVideo(customVideoUrl);

                    const youtubeId = extractYouTubeId(customVideoUrl);
                    if (youtubeId) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'background-placeholder';
                        placeholder.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: black; z-index: -1;';
                        background.appendChild(placeholder);

                        const iframe = document.createElement('iframe');
                        iframe.className = 'background-video';
                        iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&mute=1&controls=0&playlist=${youtubeId}`;
                        iframe.allow = 'autoplay; encrypted-media';
                        iframe.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1; opacity: 0; border: none;';
                        iframe.addEventListener('error', () => {
                            alert('YouTube embed failed. Using default Fortnite video.');
                            loadDefaultVideo(defaultVideo, background, customGradient, customColor);
                        });
                        background.appendChild(iframe);
                        setTimeout(() => {
                            iframe.style.opacity = '0.8';
                            placeholder.remove();
                            document.documentElement.style.setProperty('--theme-background', 'transparent');
                            localStorage.setItem('cachedBgStyle', 'transparent');
                        }, 1000);
                    } else if (customVideoUrl && isValidVideoUrl(customVideoUrl)) {
                        const video = document.createElement('video');
                        video.className = 'background-video';
                        video.src = customVideoUrl;
                        video.autoplay = true;
                        video.loop = true;
                        video.muted = true;
                        video.playsInline = true;
                        video.addEventListener('error', () => {
                            alert('Invalid video URL. Please use a direct MP4 link (e.g., https://example.com/video.mp4).');
                            loadDefaultVideo(defaultVideo, background, customGradient, customColor);
                        });
                        video.addEventListener('loadeddata', () => {
                            background.appendChild(video);
                            document.documentElement.style.setProperty('--theme-background', 'transparent');
                            localStorage.setItem('cachedBgStyle', 'transparent');
                        });
                        background.appendChild(video);
                    } else {
                        if (customVideoUrl) {
                            alert('Invalid video URL. Please use a direct MP4 link (e.g., https://example.com/video.mp4).');
                        }
                        loadDefaultVideo(defaultVideo, background, customGradient, customColor);
                    }
                } else if (themes[theme]?.youtube) {
                    const youtubeId = extractYouTubeId(themes[theme].youtube);
                    if (youtubeId) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'background-placeholder';
                        placeholder.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: black; z-index: -1;';
                        background.appendChild(placeholder);

                        const iframe = document.createElement('iframe');
                        iframe.className = 'background-video';
                        iframe.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&mute=1&controls=0&playlist=${youtubeId}`;
                        iframe.allow = 'autoplay; encrypted-media';
                        iframe.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1; opacity: 0; border: none;';
                        iframe.addEventListener('error', () => {
                            alert('YouTube embed failed. Using default Fortnite video.');
                            loadDefaultVideo(themes[theme].video, background, themes.og, '#000000');
                        });
                        background.appendChild(iframe);
                        setTimeout(() => {
                            iframe.style.opacity = '0.8';
                            placeholder.remove();
                            document.documentElement.style.setProperty('--theme-background', 'transparent');
                            localStorage.setItem('cachedBgStyle', 'transparent');
                        }, 1000);
                    } else {
                        loadDefaultVideo(themes[theme].video, background, themes.og, '#000000');
                    }
                } else if (themes[theme]?.video) {
                    const video = document.createElement('video');
                    video.className = 'background-video';
                    video.src = themes[theme].video;
                    video.autoplay = true;
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    video.addEventListener('error', () => {
                        bgStyle = themes.og;
                        document.documentElement.style.setProperty('--theme-background', bgStyle);
                        localStorage.setItem('cachedBgStyle', bgStyle);
                    });
                    video.addEventListener('loadeddata', () => {
                        background.appendChild(video);
                        document.documentElement.style.setProperty('--theme-background', 'transparent');
                        localStorage.setItem('cachedBgStyle', 'transparent');
                    });
                    background.appendChild(video);
                } else {
                    bgStyle = themes[theme] || themes.og;
                    document.documentElement.style.setProperty('--theme-background', bgStyle);
                    localStorage.setItem('cachedBgStyle', bgStyle);
                }

                updateEffects();
            } catch (e) {
                document.documentElement.style.setProperty('--theme-background', themes.og);
                localStorage.setItem('cachedBgStyle', themes.og);
            }
        }

        function loadDefaultVideo(url, background, gradient, color) {
            try {
                if (extractYouTubeId(url)) {
                    const bgStyle = gradient || color;
                    document.documentElement.style.setProperty('--theme-background', bgStyle);
                    localStorage.setItem('cachedBgStyle', bgStyle);
                    return;
                }
                const video = document.createElement('video');
                video.className = 'background-video';
                video.src = url;
                video.autoplay = true;
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.addEventListener('error', () => {
                    const bgStyle = gradient || color;
                    document.documentElement.style.setProperty('--theme-background', bgStyle);
                    localStorage.setItem('cachedBgStyle', bgStyle);
                });
                video.addEventListener('loadeddata', () => {
                    background.appendChild(video);
                    document.documentElement.style.setProperty('--theme-background', 'transparent');
                    localStorage.setItem('cachedBgStyle', 'transparent');
                });
                background.appendChild(video);
            } catch (e) {
                const bgStyle = gradient || color;
                document.documentElement.style.setProperty('--theme-background', bgStyle);
                localStorage.setItem('cachedBgStyle', bgStyle);
            }
        }

        function setDotSpeed(speed) {
            try {
                if (!Object.keys(speedConfigs).includes(speed)) return;
                currentDotSpeed = speed;
                localStorage.setItem('selectedDotSpeed', speed);
                updateEffects();
            } catch (e) {}
        }

        function setEffectDensity(density) {
            try {
                if (!Object.keys(densityConfigs).includes(density)) return;
                currentDensity = density;
                localStorage.setItem('effectDensity', density);
                updateEffects();
            } catch (e) {}
        }

        // Removed duplicate debounce function - moved to before initEffects

        window.setTheme = setTheme;
        window.setDotSpeed = setDotSpeed;
        window.setEffectDensity = setEffectDensity;
        window.updateEffects = updateEffects;
    } catch (e) {
        alert('An error occurred in the effects script. Visual effects may not work.');
    }
})();