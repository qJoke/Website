
document.addEventListener('DOMContentLoaded', () => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionPreference.matches;
    if (window.AOS) {
        AOS.init({
            duration: 600,
            once: true,
            offset: 60,
            disable: () => prefersReducedMotion
        });
        document.documentElement.classList.add('aos-ready');
    }

    // Keep keyboard focus inside an open dialog and restore the previous page state.
    const dialogStates = new Map();
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex="0"]';
    const setDialogOpen = (dialog, isOpen, backdrop = null) => {
        if (!dialog) return;
        if (isOpen) {
            if (dialogStates.has(dialog)) return;
            const siblings = Array.from(document.body.children).filter(element => element !== dialog && element !== backdrop);
            dialogStates.set(dialog, {
                focus: document.activeElement,
                overflow: document.body.style.overflow,
                siblings: siblings.map(element => [element, element.inert])
            });
            dialog.inert = false;
            dialog.setAttribute('aria-hidden', 'false');
            siblings.forEach(element => { element.inert = true; });
            document.body.style.overflow = 'hidden';
            dialog.querySelector(focusableSelector)?.focus({ preventScroll: true });
        } else {
            const state = dialogStates.get(dialog);
            if (!state) return;
            state.siblings.forEach(([element, inert]) => { element.inert = inert; });
            document.body.style.overflow = state.overflow;
            dialogStates.delete(dialog);
            if (state.focus?.isConnected) state.focus.focus({ preventScroll: true });
            dialog.inert = true;
            dialog.setAttribute('aria-hidden', 'true');
        }
    };
    document.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const dialog = Array.from(dialogStates.keys()).at(-1);
        if (!dialog) return;
        const targets = Array.from(dialog.querySelectorAll(focusableSelector)).filter(element => element.getClientRects().length && !element.closest('[inert]'));
        const first = targets[0];
        const last = targets.at(-1);
        if (!first) return;
        if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
        }
    });

    // Pricing toggle functionality
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const pricingGrids = document.querySelectorAll('.pricing-grid');

    const setActivePricingPlan = (plan) => {
        const targetGrid = document.getElementById(`${plan}-plans`);
        if (!targetGrid) return;

        toggleButtons.forEach(btn => {
            const active = btn.getAttribute('data-plan') === plan;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', String(active));
        });

        pricingGrids.forEach(grid => {
            grid.classList.toggle('active', grid === targetGrid);
        });
    };

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const plan = button.getAttribute('data-plan');
            if (!plan || button.classList.contains('active')) return;
            setActivePricingPlan(plan);
        });
    });

    // Local package finder recommendation
    const packageFinder = document.querySelector('.package-finder');
    const finderDuration = document.getElementById('finder-duration');
    const finderTier = document.getElementById('finder-tier');
    const finderResult = document.getElementById('package-finder-result');
    const finderApply = packageFinder?.querySelector('.package-finder__apply');

    const recommendationCopy = {
        'Standard 1 lună': 'Cel mai mic cost ca să testezi serviciul complet, fără angajament.',
        'Standard 4 luni': 'Echilibru bun între preț și durată: 3 luni plătite + 1 lună bonus.',
        'Standard 7 luni': 'Acoperă un sezon întreg: 6 luni plătite + 1 lună bonus.',
        'Standard 13 luni': 'Un an întreg cu o lună bonus — cel mai bun preț pe lună din linia Standard.',
        'VIP 1 lună': 'O lună de probă cu tot conținutul, inclusiv calitate 4K.',
        'VIP 4 luni': 'Cel mai echilibrat pachet VIP: 3 luni + 1 bonus, calitate 4K și suport complet.',
        'VIP 8 luni': 'Durată lungă pentru diaspora: 6 luni plătite + 2 luni bonus, în 4K.',
        'VIP 14 luni': 'Plan anual cu două luni cadou — cel mai bun preț pe lună la calitate 4K.'
    };

    const planMatrix = {
        standard: { '1': 'Standard 1 lună', '4': 'Standard 4 luni', '8': 'Standard 7 luni', '14': 'Standard 13 luni' },
        vip: { '1': 'VIP 1 lună', '4': 'VIP 4 luni', '8': 'VIP 8 luni', '14': 'VIP 14 luni' }
    };

    const getPackageRecommendation = () => {
        const tier = finderTier?.value === 'standard' ? 'standard' : 'vip';
        const duration = finderDuration?.value || '4';
        return planMatrix[tier][duration] || planMatrix[tier]['4'];
    };

    const clearRecommendedPlans = () => {
        document.querySelectorAll('.pricing-card--recommended').forEach(card => {
            card.classList.remove('pricing-card--recommended');
        });
    };

    const findPlanCard = (planName) => {
        const planNames = document.querySelectorAll('.plan-name');
        return Array.from(planNames).find(name => name.textContent.trim() === planName)?.closest('.pricing-card') || null;
    };

    const updatePackageFinder = () => {
        if (!finderResult) return null;
        const planName = getPackageRecommendation();
        const resultTitle = finderResult.querySelector('strong');
        const resultText = finderResult.querySelector('p');
        if (resultTitle) resultTitle.textContent = planName;
        if (resultText) resultText.textContent = recommendationCopy[planName] || recommendationCopy['VIP 4 luni'];
        return planName;
    };

    const applyPackageRecommendation = () => {
        const planName = updatePackageFinder();
        if (!planName) return;
        const tier = planName.toLowerCase().includes('standard') ? 'standard' : 'vip';
        setActivePricingPlan(tier);
        clearRecommendedPlans();

        const card = findPlanCard(planName);
        if (card) {
            card.classList.add('pricing-card--recommended');
            card.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
        }
    };

    finderDuration?.addEventListener('change', updatePackageFinder);
    finderTier?.addEventListener('change', () => {
        updatePackageFinder();
        setActivePricingPlan(finderTier.value === 'standard' ? 'standard' : 'vip');
    });
    finderApply?.addEventListener('click', applyPackageRecommendation);
    updatePackageFinder();

    // Pricing feature expand/collapse
    document.querySelectorAll('.pricing-card').forEach(card => {
        const featureList = card.querySelector('.features-list');
        if (!featureList || featureList.children.length <= 5) return;

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'pricing-details-toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = 'Vezi toate beneficiile';
        featureList.insertAdjacentElement('afterend', toggle);

        toggle.addEventListener('click', () => {
            const isExpanded = card.classList.toggle('is-expanded');
            toggle.setAttribute('aria-expanded', String(isExpanded));
            toggle.textContent = isExpanded ? 'Ascunde beneficiile extra' : 'Vezi toate beneficiile';
        });
    });

    // Locale-aware currency display
    const priceElements = document.querySelectorAll('.price-value[data-price]');
    if (priceElements.length > 0) {
        const applyCurrency = (currency) => {
            const symbol = currency === 'GBP' ? '\u00a3' : '\u20ac';
            priceElements.forEach(element => {
                const amount = element.dataset.price || '';
                if (amount.length === 0) return;
                element.textContent = `${symbol}${amount}`;
            });
        };

        const detectLocation = async () => {
            if (typeof fetch !== 'function') return false;

            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeoutId = controller ? window.setTimeout(() => controller.abort(), 2500) : null;

            try {
                const fetchOptions = {
                    cache: 'no-store',
                    credentials: 'omit',
                    headers: { Accept: 'application/json' },
                    referrerPolicy: 'no-referrer'
                };

                if (controller) {
                    fetchOptions.signal = controller.signal;
                }

                const response = await fetch('/geo.json', fetchOptions);
                if (!response.ok) return false;

                const data = await response.json();
                const countryCode = typeof data?.country === 'string' ? data.country.trim().toUpperCase() : '';

                return countryCode === 'GB';
            } catch (error) {
                return false;
            } finally {
                if (timeoutId) {
                    window.clearTimeout(timeoutId);
                }
            }
        };

        applyCurrency('EUR');

        detectLocation().then(isGB => {
            if (isGB) {
                applyCurrency('GBP');
            }
        });
    }

    // FAQ accordion functionality
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach((question, index) => {
        const panel = question.nextElementSibling;
        if (!panel) return;
        question.id = `faq-question-${index}`;
        panel.id = `faq-answer-${index}`;
        question.setAttribute('aria-controls', panel.id);
        panel.setAttribute('aria-labelledby', question.id);
        const setExpanded = (button, answer, expanded) => {
            button.classList.toggle('active', expanded);
            button.setAttribute('aria-expanded', String(expanded));
            answer.hidden = !expanded;
            answer.style.maxHeight = expanded ? 'none' : '';
        };
        setExpanded(question, panel, question.classList.contains('active'));
        question.addEventListener('click', () => {
            const activeQuestion = document.querySelector('.faq-question.active');
            if (activeQuestion && activeQuestion !== question) {
                const activeAnswer = activeQuestion.nextElementSibling;
                if (activeAnswer) setExpanded(activeQuestion, activeAnswer, false);
            }
            setExpanded(question, panel, !question.classList.contains('active'));
        });
    });

    // Animated counters for stats section
    const statCards = document.querySelectorAll('.stat-card');
    const observerOptions = {
        threshold: 0.35
    };

    const animateCounter = (entry) => {
        const element = entry.target;
        const targetValue = parseInt(element.dataset.target || '0', 10);
        const suffix = element.dataset.suffix || '';
        const valueElement = element.querySelector('.stat-value');
        if (!valueElement) return;

        const formatValue = (value, includeSuffix = false) => {
            const formatted = value.toLocaleString('ro-RO');
            return includeSuffix && suffix ? `${formatted}${suffix}` : formatted;
        };

        if (prefersReducedMotion) {
            valueElement.textContent = formatValue(targetValue, true);
            return;
        }

        let current = 0;
        const duration = 1800;
        const stepTime = 20;
        const step = Math.max(Math.floor((targetValue * stepTime) / duration), 1);

        const counterInterval = setInterval(() => {
            current += step;
            if (current >= targetValue) {
                valueElement.textContent = formatValue(targetValue, true);
                clearInterval(counterInterval);
            } else {
                valueElement.textContent = formatValue(current);
            }
        }, stepTime);
    };

    if ('IntersectionObserver' in window) {
        const statObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry);
                    obs.unobserve(entry.target);
                }
            });
        }, observerOptions);

        statCards.forEach(card => statObserver.observe(card));
    } else {
        statCards.forEach(card => animateCounter({ target: card }));
    }

    // Testimonials infinite slider
    const sliderTrack = document.querySelector('.testimonials-track');
    const sliderWindow = document.querySelector('.testimonials-window');
    const prevButton = document.querySelector('.slider-btn--prev');
    const nextButton = document.querySelector('.slider-btn--next');

    if (sliderTrack && sliderWindow) {
        const originalSlides = Array.from(sliderTrack.children);
        const slideCount = originalSlides.length;
        const cloneCount = Math.min(3, slideCount); // Clone first/last 3 cards for seamless loop

        // Clone slides for infinite effect
        const setupInfiniteLoop = () => {
            // Clone last N slides and prepend
            for (let i = slideCount - 1; i >= slideCount - cloneCount; i--) {
                const clone = originalSlides[i].cloneNode(true);
                clone.classList.add('clone');
                clone.setAttribute('aria-hidden', 'true');
                sliderTrack.insertBefore(clone, sliderTrack.firstChild);
            }
            // Clone first N slides and append
            for (let i = 0; i < cloneCount; i++) {
                const clone = originalSlides[i].cloneNode(true);
                clone.classList.add('clone');
                clone.setAttribute('aria-hidden', 'true');
                sliderTrack.appendChild(clone);
            }
        };

        setupInfiniteLoop();

        const allSlides = Array.from(sliderTrack.children);
        let currentIndex = cloneCount; // Start at first real slide
        let isDragging = false;
        let startX = 0;
        let startScrollLeft = 0;
        let lastScrollLeft = 0;
        let lastTimestamp = 0;
        let velocity = 0;
        let momentumFrame = null;
        let isRepositioning = false;

        const getSlideWidth = () => {
            const slide = allSlides[cloneCount];
            if (!slide) return 300;
            const style = window.getComputedStyle(sliderTrack);
            const gap = parseFloat(style.gap) || 24;
            return slide.offsetWidth + gap;
        };

        const getScrollPositionForIndex = (index) => {
            const slideWidth = getSlideWidth();
            return index * slideWidth;
        };

        const stopMomentum = () => {
            if (momentumFrame) {
                cancelAnimationFrame(momentumFrame);
                momentumFrame = null;
            }
            sliderWindow.classList.remove('is-gliding');
        };

        // Instantly reposition without animation when reaching clones
        const checkBoundaries = () => {
            if (isRepositioning) return;

            const slideWidth = getSlideWidth();
            const scrollLeft = sliderWindow.scrollLeft;
            const firstRealPosition = cloneCount * slideWidth;
            const lastRealPosition = (cloneCount + slideCount - 1) * slideWidth;
            const cloneStartThreshold = (cloneCount - 1) * slideWidth;
            const cloneEndThreshold = (cloneCount + slideCount) * slideWidth;

            if (scrollLeft <= cloneStartThreshold) {
                // Jumped to start clones - reposition to end real slides
                isRepositioning = true;
                const offset = scrollLeft - cloneStartThreshold;
                sliderWindow.style.scrollBehavior = 'auto';
                sliderWindow.scrollLeft = lastRealPosition + offset;
                currentIndex = cloneCount + slideCount - 1;
                requestAnimationFrame(() => {
                    sliderWindow.style.scrollBehavior = '';
                    isRepositioning = false;
                });
            } else if (scrollLeft >= cloneEndThreshold) {
                // Jumped to end clones - reposition to start real slides
                isRepositioning = true;
                const offset = scrollLeft - cloneEndThreshold;
                sliderWindow.style.scrollBehavior = 'auto';
                sliderWindow.scrollLeft = firstRealPosition + offset;
                currentIndex = cloneCount;
                requestAnimationFrame(() => {
                    sliderWindow.style.scrollBehavior = '';
                    isRepositioning = false;
                });
            }
        };

        // Initialize position to first real slide
        const initPosition = () => {
            sliderWindow.style.scrollBehavior = 'auto';
            sliderWindow.scrollLeft = getScrollPositionForIndex(cloneCount);
            requestAnimationFrame(() => {
                sliderWindow.style.scrollBehavior = '';
            });
        };

        const scrollToIndex = (index, smooth = true) => {
            stopMomentum();
            currentIndex = index;
            const targetScroll = getScrollPositionForIndex(index);
            sliderWindow.scrollTo({
                left: targetScroll,
                behavior: smooth && !prefersReducedMotion ? 'smooth' : 'auto'
            });
        };

        const scrollByStep = (direction) => {
            stopMomentum();
            currentIndex += direction;
            scrollToIndex(currentIndex, true);

            // Check boundaries after scroll completes
            setTimeout(checkBoundaries, 350);
        };

        prevButton?.addEventListener('click', () => scrollByStep(-1));
        nextButton?.addEventListener('click', () => scrollByStep(1));

        const startMomentumScroll = () => {
            stopMomentum();
            sliderWindow.classList.add('is-gliding');
            const friction = 0.94;
            const minVelocity = 0.008;
            let currentVelocity = Math.max(Math.min(velocity, 3.5), -3.5);
            let lastTime = performance.now();

            const step = (now) => {
                if (isRepositioning) {
                    momentumFrame = requestAnimationFrame(step);
                    return;
                }

                const deltaTime = now - lastTime;
                lastTime = now;
                sliderWindow.scrollLeft += currentVelocity * deltaTime;
                currentVelocity *= friction;

                checkBoundaries();

                if (Math.abs(currentVelocity) < minVelocity) {
                    stopMomentum();
                    // Snap to nearest slide
                    const slideWidth = getSlideWidth();
                    const nearestIndex = Math.round(sliderWindow.scrollLeft / slideWidth);
                    scrollToIndex(nearestIndex, true);
                    return;
                }

                momentumFrame = requestAnimationFrame(step);
            };

            momentumFrame = requestAnimationFrame(step);
        };

        const endDrag = (event) => {
            if (!isDragging) return;
            isDragging = false;
            sliderWindow.classList.remove('is-grabbing');
            sliderWindow.style.scrollBehavior = '';

            if (Math.abs(velocity) < 0.01) {
                // Snap to nearest slide
                const slideWidth = getSlideWidth();
                const nearestIndex = Math.round(sliderWindow.scrollLeft / slideWidth);
                scrollToIndex(nearestIndex, true);
            } else {
                startMomentumScroll();
            }

            if (
                event &&
                typeof sliderWindow.releasePointerCapture === 'function' &&
                typeof sliderWindow.hasPointerCapture === 'function' &&
                sliderWindow.hasPointerCapture(event.pointerId)
            ) {
                sliderWindow.releasePointerCapture(event.pointerId);
            }
        };

        sliderWindow.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            stopMomentum();
            isDragging = true;
            startX = event.clientX;
            startScrollLeft = sliderWindow.scrollLeft;
            lastScrollLeft = startScrollLeft;
            lastTimestamp = performance.now();
            velocity = 0;
            sliderWindow.classList.add('is-grabbing');
            sliderWindow.style.scrollBehavior = 'auto';
            if (typeof sliderWindow.setPointerCapture === 'function') {
                sliderWindow.setPointerCapture(event.pointerId);
            }
        });

        sliderWindow.addEventListener('pointermove', (event) => {
            if (!isDragging) return;
            const delta = event.clientX - startX;
            sliderWindow.scrollLeft = startScrollLeft - delta;

            const now = performance.now();
            const elapsed = now - lastTimestamp;
            if (elapsed > 0) {
                const currentScroll = sliderWindow.scrollLeft;
                velocity = (currentScroll - lastScrollLeft) / elapsed;
                lastScrollLeft = currentScroll;
                lastTimestamp = now;
            }

            checkBoundaries();
        });

        ['pointerup', 'pointerleave', 'pointercancel'].forEach(type => {
            sliderWindow.addEventListener(type, endDrag);
        });

        sliderWindow.addEventListener('scroll', () => {
            if (!isDragging && !isRepositioning) {
                checkBoundaries();
            }
        }, { passive: true });

        window.addEventListener('resize', () => {
            stopMomentum();
            // Recenter on current slide after resize
            scrollToIndex(currentIndex, false);
        });

        // Initialize
        initPosition();
    }

    // Recent movies slider + trailer modal
    const recentMoviesTrack = document.getElementById('recent-movies-track');
    const recentMoviesWindow = document.querySelector('.recent-movies-window');
    const recentMoviesPrev = document.querySelector('.recent-movies-btn--prev');
    const recentMoviesNext = document.querySelector('.recent-movies-btn--next');

    const recentMovies = [
        {
            title: 'Avatar',
            query: 'Avatar 2009',
            poster: 'https://image.tmdb.org/t/p/w780/gKY6q7SjCkAU6FqvqWybDYgUKIF.jpg',
            releaseDate: '2009-12-18',
            imdbRating: '7.9',
            trailerUrl: 'https://www.youtube.com/watch?v=5PSNL1qE6VY'
        },
        {
            title: 'Avengers: Endgame',
            query: 'Avengers: Endgame 2019',
            poster: 'https://image.tmdb.org/t/p/w780/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg',
            releaseDate: '2019-04-26',
            imdbRating: '8.4',
            trailerUrl: 'https://www.youtube.com/watch?v=TcMBFSGVi1c'
        },
        {
            title: 'Avatar: The Way of Water',
            query: 'Avatar: The Way of Water 2022',
            poster: 'https://image.tmdb.org/t/p/w780/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
            releaseDate: '2022-12-16',
            imdbRating: '7.5',
            trailerUrl: 'https://www.youtube.com/watch?v=d9MyW72ELq0'
        },
        {
            title: 'Titanic',
            query: 'Titanic 1997',
            poster: 'https://image.tmdb.org/t/p/w780/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg',
            releaseDate: '1997-12-19',
            imdbRating: '7.9',
            trailerUrl: 'https://www.youtube.com/watch?v=kVrqfYjkTdQ'
        },
        {
            title: 'Ne Zha 2',
            query: 'Ne Zha 2 2025',
            poster: 'https://image.tmdb.org/t/p/w780/cb5NyNrqiCNNoDkA8FfxHAtypdG.jpg',
            releaseDate: '2025-01-29',
            imdbRating: '7.1',
            trailerUrl: 'https://www.youtube.com/watch?v=nsXQijb0F4I'
        },
        {
            title: 'Star Wars: Episode VII - The Force Awakens',
            query: 'Star Wars: The Force Awakens 2015',
            poster: 'https://image.tmdb.org/t/p/w780/wqnLdwVXoBjKibFRR5U3y0aDUhs.jpg',
            releaseDate: '2015-12-18',
            imdbRating: '7.8',
            trailerUrl: 'https://www.youtube.com/watch?v=sGbxmsDFVnE'
        },
        {
            title: 'Avengers: Infinity War',
            query: 'Avengers: Infinity War 2018',
            poster: 'https://image.tmdb.org/t/p/w780/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
            releaseDate: '2018-04-27',
            imdbRating: '8.4',
            trailerUrl: 'https://www.youtube.com/watch?v=6ZfuNTqbHE8'
        },
        {
            title: 'Spider-Man: No Way Home',
            query: 'Spider-Man: No Way Home 2021',
            poster: 'https://image.tmdb.org/t/p/w780/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
            releaseDate: '2021-12-17',
            imdbRating: '8.2',
            trailerUrl: 'https://www.youtube.com/watch?v=JfVOs4VSpmA'
        },
        {
            title: 'Zootopia 2',
            query: 'Zootopia 2 2025',
            poster: 'https://image.tmdb.org/t/p/w780/oJ7g2CifqpStmoYQyaLQgEU32qO.jpg',
            releaseDate: '2025-11-26',
            imdbRating: 'TBD',
            trailerUrl: 'https://www.youtube.com/watch?v=sEgPQ7HKoBA'
        },
        {
            title: 'Inside Out 2',
            query: 'Inside Out 2 2024',
            poster: 'https://image.tmdb.org/t/p/w780/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
            releaseDate: '2024-06-14',
            imdbRating: '7.6',
            trailerUrl: 'https://www.youtube.com/watch?v=LEjhY15eCx0'
        },
        {
            title: 'Jurassic World',
            query: 'Jurassic World 2015',
            poster: 'https://image.tmdb.org/t/p/w780/rhr4y79GpxQF9IsfJItRXVaoGs4.jpg',
            releaseDate: '2015-06-12',
            imdbRating: '6.9',
            trailerUrl: 'https://www.youtube.com/watch?v=RFinNxS5KN4'
        },
        {
            title: 'The Lion King (2019)',
            query: 'The Lion King 2019',
            poster: 'https://image.tmdb.org/t/p/w780/dzBtMocZuJbjLOXvrl4zGYigDzh.jpg',
            releaseDate: '2019-07-19',
            imdbRating: '6.8',
            trailerUrl: 'https://www.youtube.com/watch?v=7TavVZMewpY'
        },
        {
            title: 'The Avengers',
            query: 'The Avengers 2012',
            poster: 'https://image.tmdb.org/t/p/w780/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg',
            releaseDate: '2012-05-04',
            imdbRating: '8.0',
            trailerUrl: 'https://www.youtube.com/watch?v=eOrNdBpGMv8'
        },
        {
            title: 'Furious 7',
            query: 'Furious 7 2015',
            poster: 'https://image.tmdb.org/t/p/w780/ktofZ9Htrjiy0P6LEowsDaxd3Ri.jpg',
            releaseDate: '2015-04-03',
            imdbRating: '7.1',
            trailerUrl: 'https://www.youtube.com/watch?v=Skpu5HaVkOc'
        },
        {
            title: 'Top Gun: Maverick',
            query: 'Top Gun: Maverick 2022',
            poster: 'https://image.tmdb.org/t/p/w780/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
            releaseDate: '2022-05-27',
            imdbRating: '8.2',
            trailerUrl: 'https://www.youtube.com/watch?v=giXco2jaZ_4'
        },
        {
            title: 'Frozen II',
            query: 'Frozen II 2019',
            poster: 'https://image.tmdb.org/t/p/w780/mINJaa34MtknCYl5AjtNJzWj8cD.jpg',
            releaseDate: '2019-11-22',
            imdbRating: '6.8',
            trailerUrl: 'https://www.youtube.com/watch?v=Zi4LMpSDccc'
        },
        {
            title: 'Barbie',
            query: 'Barbie 2023',
            poster: 'https://image.tmdb.org/t/p/w780/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg',
            releaseDate: '2023-07-21',
            imdbRating: '6.8',
            trailerUrl: 'https://www.youtube.com/watch?v=pBk4NYhWNMM'
        },
        {
            title: 'Avengers: Age of Ultron',
            query: 'Avengers: Age of Ultron 2015',
            poster: 'https://image.tmdb.org/t/p/w780/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg',
            releaseDate: '2015-05-01',
            imdbRating: '7.3',
            trailerUrl: 'https://www.youtube.com/watch?v=tmeOjFno6Do'
        },
        {
            title: 'Avatar: Fire and Ash',
            query: 'Avatar: Fire and Ash 2025',
            poster: 'https://image.tmdb.org/t/p/w780/bRBeSHfGHwkEpImlhxPmOcUsaeg.jpg',
            releaseDate: '2025-12-19',
            imdbRating: 'TBD',
            trailerUrl: 'https://www.youtube.com/watch?v=nb_fFj_0rq8'
        },
        {
            title: 'The Super Mario Bros. Movie',
            query: 'The Super Mario Bros. Movie 2023',
            poster: 'https://image.tmdb.org/t/p/w780/qNBAXBIQlnOThrVvA6mA2B5ggV6.jpg',
            releaseDate: '2023-04-05',
            imdbRating: '7.0',
            trailerUrl: 'https://www.youtube.com/watch?v=KydqdKKyGEk'
        }
    ];

    const placeholderPoster =
        'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

    const renderRecentMovies = () => {
        if (!recentMoviesTrack) return;
        recentMoviesTrack.innerHTML = recentMovies
            .map((movie, index) => {
                const rating =
                    movie.imdbRating === 0 || movie.imdbRating
                        ? movie.imdbRating.toString()
                        : '—';
                const ratingLabelText = 'IMDb';
                const dateMarkup = movie.addedDate
                    ? `
                            <span class="movie-card__date">
                                <i class="far fa-calendar"></i>
                                <span class="movie-date__value">${movie.addedDate}</span>
                            </span>
                        `
                    : '';
                const releaseText = movie.releaseDate ? formatReleaseDate(movie.releaseDate) : '—';
                const posterSrc = movie.poster?.replace('/w780/', '/w500/') || placeholderPoster;
                const posterSet = movie.poster ? `srcset="${posterSrc} 500w, ${movie.poster} 780w" sizes="(max-width: 768px) 200px, 260px"` : '';
                return `
                <article class="movie-card" data-index="${index}">
                    <div class="movie-card__poster">
                        <img src="${posterSrc}" ${posterSet} alt="Poster ${movie.title}" loading="lazy"
                            decoding="async" draggable="false" width="342" height="513">
                        <span class="movie-card__quality-badge">HD/4K</span>
                        <button class="movie-card__play" type="button" data-trailer-index="${index}"
                            aria-label="Redă previzualizarea video pentru ${movie.title}">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                    <div class="movie-card__body">
                        <h3 class="movie-card__title">${movie.title}</h3>
                        <div class="movie-card__meta">
                            <span class="movie-card__rating">
                                <i class="fas fa-star"></i>
                                <span class="movie-rating__value">${rating}</span>
                                <span class="movie-rating__label">${ratingLabelText}</span>
                            </span>
                            <span class="movie-card__release">
                                <i class="far fa-clock"></i>
                                <span class="movie-release__value">${releaseText}</span>
                            </span>
                            ${dateMarkup}
                        </div>
                    </div>
                </article>
            `;
            })
            .join('');
    };

    let recentSlideCount = 0;
    let recentCloneCount = 0;
    let recentCurrentIndex = 0;
    let recentIsRepositioning = false;
    let recentIsDragging = false;
    let recentDragStartX = 0;
    let recentDragStartScrollLeft = 0;
    let recentHasDragged = false;
    let recentAutoTimer = null;
    let recentAutoResumeTimer = null;
    let recentIsAutoPaused = false;

    const recentAutoSpeed = 18;
    const recentAutoIntervalMs = 30;
    const recentAutoStepPx = (recentAutoSpeed * recentAutoIntervalMs) / 1000;

    let recentIsVisible = !('IntersectionObserver' in window);
    let recentUserPaused = prefersReducedMotion;
    let recentIsHovered = false;
    const recentPauseButton = document.querySelector('.recent-movies-pause');

    const getRecentSlideWidth = () => {
        if (!recentMoviesTrack) return 260;
        const slide = recentMoviesTrack.querySelector('.movie-card');
        if (!slide) return 260;
        const gap = parseFloat(getComputedStyle(recentMoviesTrack).gap) || 24;
        return slide.offsetWidth + gap;
    };

    const getRecentScrollForIndex = (index) => index * getRecentSlideWidth();

    const getNearestRecentIndex = () => {
        if (!recentMoviesWindow) return recentCloneCount;
        const slideWidth = getRecentSlideWidth();
        if (!slideWidth) return recentCloneCount;
        return Math.round(recentMoviesWindow.scrollLeft / slideWidth);
    };

    const syncRecentIndex = () => {
        recentCurrentIndex = getNearestRecentIndex();
    };

    const initRecentPosition = () => {
        if (!recentMoviesWindow) return;
        recentMoviesWindow.style.scrollBehavior = 'auto';
        recentMoviesWindow.scrollLeft = getRecentScrollForIndex(recentCloneCount);
        syncRecentIndex();
        requestAnimationFrame(() => {
            recentMoviesWindow.style.scrollBehavior = '';
        });
    };

    const checkRecentBoundaries = () => {
        if (recentIsRepositioning || !recentMoviesWindow) return;
        const slideWidth = getRecentSlideWidth();
        const scrollLeft = recentMoviesWindow.scrollLeft;
        const cloneStartThreshold = (recentCloneCount - 1) * slideWidth;
        const cloneEndThreshold = (recentCloneCount + recentSlideCount) * slideWidth;
        const firstRealPosition = recentCloneCount * slideWidth;
        const lastRealPosition = (recentCloneCount + recentSlideCount - 1) * slideWidth;

        if (scrollLeft <= cloneStartThreshold) {
            recentIsRepositioning = true;
            const offset = scrollLeft - cloneStartThreshold;
            recentMoviesWindow.style.scrollBehavior = 'auto';
            recentMoviesWindow.scrollLeft = lastRealPosition + offset;
            recentCurrentIndex = recentCloneCount + recentSlideCount - 1;
            requestAnimationFrame(() => {
                recentMoviesWindow.style.scrollBehavior = '';
                recentIsRepositioning = false;
                syncRecentIndex();
            });
        } else if (scrollLeft >= cloneEndThreshold) {
            recentIsRepositioning = true;
            const offset = scrollLeft - cloneEndThreshold;
            recentMoviesWindow.style.scrollBehavior = 'auto';
            recentMoviesWindow.scrollLeft = firstRealPosition + offset;
            recentCurrentIndex = recentCloneCount;
            requestAnimationFrame(() => {
                recentMoviesWindow.style.scrollBehavior = '';
                recentIsRepositioning = false;
                syncRecentIndex();
            });
        }
    };

    const scrollRecentToIndex = (index, smooth = true) => {
        if (!recentMoviesWindow) return;
        recentCurrentIndex = index;
        recentMoviesWindow.scrollTo({
            left: getRecentScrollForIndex(index),
            behavior: smooth && !prefersReducedMotion ? 'smooth' : 'auto'
        });
    };

    const pauseRecentAuto = () => {
        recentIsAutoPaused = true;
        if (recentAutoTimer) {
            clearInterval(recentAutoTimer);
            recentAutoTimer = null;
        }
        if (recentAutoResumeTimer) {
            clearTimeout(recentAutoResumeTimer);
            recentAutoResumeTimer = null;
        }
    };

    const startRecentAuto = () => {
        if (prefersReducedMotion || !recentMoviesWindow || document.hidden || !recentIsVisible || recentUserPaused || recentIsHovered || recentMoviesWindow.contains(document.activeElement) || document.querySelector('.trailer-modal.is-open')) return;
        if (recentAutoTimer) return;
        recentIsAutoPaused = false;
        recentAutoTimer = setInterval(() => {
            if (recentIsAutoPaused || recentIsDragging || recentIsRepositioning) return;
            recentMoviesWindow.scrollLeft += recentAutoStepPx;
            checkRecentBoundaries();
            syncRecentIndex();
        }, recentAutoIntervalMs);
    };

    const scheduleRecentAuto = (delay = 1000) => {
        if (prefersReducedMotion) return;
        if (recentAutoResumeTimer) {
            clearTimeout(recentAutoResumeTimer);
        }
        recentAutoResumeTimer = setTimeout(() => {
            recentAutoResumeTimer = null;
            startRecentAuto();
        }, delay);
    };

    const scrollRecentMoviesBy = (direction) => {
        if (!recentMoviesWindow) return;
        pauseRecentAuto();
        const baseIndex = getNearestRecentIndex();
        scrollRecentToIndex(baseIndex + direction, true);
        setTimeout(() => {
            checkRecentBoundaries();
            syncRecentIndex();
        }, 380);
        scheduleRecentAuto(1200);
    };

    const setupRecentMoviesInfinite = () => {
        if (!recentMoviesTrack) return;
        const originalSlides = Array.from(recentMoviesTrack.children);
        recentSlideCount = originalSlides.length;
        if (recentSlideCount === 0) return;
        recentCloneCount = Math.min(3, recentSlideCount);

        for (let i = recentSlideCount - 1; i >= recentSlideCount - recentCloneCount; i--) {
            const clone = originalSlides[i].cloneNode(true);
            clone.classList.add('clone');
            clone.setAttribute('aria-hidden', 'true');
            clone.querySelectorAll('button').forEach((button) => {
                button.setAttribute('tabindex', '-1');
            });
            recentMoviesTrack.insertBefore(clone, recentMoviesTrack.firstChild);
        }

        for (let i = 0; i < recentCloneCount; i++) {
            const clone = originalSlides[i].cloneNode(true);
            clone.classList.add('clone');
            clone.setAttribute('aria-hidden', 'true');
            clone.querySelectorAll('button').forEach((button) => {
                button.setAttribute('tabindex', '-1');
            });
            recentMoviesTrack.appendChild(clone);
        }

        recentCurrentIndex = recentCloneCount;
        initRecentPosition();
    };

    const startRecentDrag = (event) => {
        if (!recentMoviesWindow) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (event.target.closest('.movie-card__play')) return;

        recentIsDragging = true;
        recentHasDragged = false;
        recentDragStartX = event.clientX;
        recentDragStartScrollLeft = recentMoviesWindow.scrollLeft;
        recentMoviesWindow.classList.add('is-grabbing');
        recentMoviesWindow.style.scrollBehavior = 'auto';
        pauseRecentAuto();

        if (typeof recentMoviesWindow.setPointerCapture === 'function') {
            recentMoviesWindow.setPointerCapture(event.pointerId);
        }
    };

    const moveRecentDrag = (event) => {
        if (!recentIsDragging || !recentMoviesWindow) return;
        const delta = event.clientX - recentDragStartX;
        if (!recentHasDragged && Math.abs(delta) > 3) {
            recentHasDragged = true;
        }

        recentMoviesWindow.scrollLeft = recentDragStartScrollLeft - delta;
        checkRecentBoundaries();
        syncRecentIndex();

        if (recentHasDragged) {
            event.preventDefault();
        }
    };

    const endRecentDrag = (event) => {
        if (!recentIsDragging || !recentMoviesWindow) return;
        recentIsDragging = false;
        recentMoviesWindow.classList.remove('is-grabbing');
        recentMoviesWindow.style.scrollBehavior = '';

        if (
            event &&
            typeof recentMoviesWindow.releasePointerCapture === 'function' &&
            typeof recentMoviesWindow.hasPointerCapture === 'function' &&
            recentMoviesWindow.hasPointerCapture(event.pointerId)
        ) {
            recentMoviesWindow.releasePointerCapture(event.pointerId);
        }

        if (recentHasDragged) {
            const targetIndex = getNearestRecentIndex();
            scrollRecentToIndex(targetIndex, true);
            setTimeout(() => {
                checkRecentBoundaries();
                syncRecentIndex();
            }, 380);
        }

        scheduleRecentAuto(recentHasDragged ? 1200 : 700);
    };

    if (recentMoviesPrev && recentMoviesNext) {
        recentMoviesPrev.addEventListener('click', () => scrollRecentMoviesBy(-1));
        recentMoviesNext.addEventListener('click', () => scrollRecentMoviesBy(1));
    }

    const formatReleaseDate = (releaseDate) => {
        if (!releaseDate) return '—';
        const parts = releaseDate.split('-');
        if (parts.length !== 3) return releaseDate;
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
    };

    const trailerModal = document.getElementById('trailer-modal');
    const trailerFrame = trailerModal ? trailerModal.querySelector('iframe') : null;
    const trailerFallback = trailerModal ? trailerModal.querySelector('.trailer-modal__fallback') : null;

    const setTrailerFallback = (isVisible) => {
        if (!trailerFallback) return;
        trailerFallback.classList.toggle('visible', isVisible);
    };

    const closeTrailer = () => {
        if (!trailerModal) return;
        setDialogOpen(trailerModal, false);
        trailerModal.classList.remove('is-open');
        if (trailerFrame) {
            trailerFrame.removeAttribute('src');
        }
        setTrailerFallback(false);
    };

    const getYoutubeEmbedUrl = (url) => {
        if (!url) return '';
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol !== 'https:') return '';
            let videoId = '';

            if (parsedUrl.hostname === 'youtu.be') {
                videoId = parsedUrl.pathname.replace('/', '');
            } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsedUrl.hostname)) {
                videoId = parsedUrl.searchParams.get('v') || parsedUrl.pathname.split('/').filter(Boolean).pop() || '';
            }

            if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return '';
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`;
        } catch (error) {
            return '';
        }
    };

    const openTrailer = async (movie) => {
        if (!trailerModal || !trailerFrame) return;
        trailerModal.classList.add('is-open');
        setDialogOpen(trailerModal, true);
        pauseRecentAuto();
        trailerFrame.title = `Previzualizare video: ${movie.title}`;

        const embedUrl = getYoutubeEmbedUrl(movie.trailerUrl);
        if (embedUrl) {
            setTrailerFallback(false);
            trailerFrame.src = embedUrl;
            return;
        }
        setTrailerFallback(true);
    };

    if (trailerModal) {
        const closeButtons = trailerModal.querySelectorAll('[data-trailer-close]');
        closeButtons.forEach((button) => button.addEventListener('click', closeTrailer));
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && trailerModal.classList.contains('is-open')) {
                closeTrailer();
            }
        });
    }

    if (recentMoviesTrack) {
        recentMoviesTrack.addEventListener('error', event => {
            const poster = event.target;
            if (poster instanceof HTMLImageElement && poster.getAttribute('src') !== placeholderPoster) {
                poster.removeAttribute('srcset');
                poster.src = placeholderPoster;
            }
        }, true);
        renderRecentMovies();
        setupRecentMoviesInfinite();
        recentMoviesTrack.addEventListener('dragstart', (event) => {
            event.preventDefault();
        });
        recentMoviesTrack.addEventListener('click', (event) => {
            const button = event.target.closest('.movie-card__play');
            if (!button) return;
            const index = Number(button.dataset.trailerIndex || '-1');
            const movie = recentMovies[index];
            if (!movie) return;
            openTrailer(movie);
        });
        if (recentMoviesWindow) {
            recentMoviesWindow.addEventListener('scroll', () => {
                if (!recentIsRepositioning) {
                    checkRecentBoundaries();
                }
                syncRecentIndex();
            }, { passive: true });
            recentMoviesWindow.addEventListener('pointerdown', startRecentDrag);
            recentMoviesWindow.addEventListener('pointermove', moveRecentDrag);
            ['pointerup', 'pointerleave', 'pointercancel'].forEach((eventType) => {
                recentMoviesWindow.addEventListener(eventType, endRecentDrag);
            });
            recentMoviesWindow.addEventListener('focusin', pauseRecentAuto);
            recentMoviesWindow.addEventListener('focusout', () => scheduleRecentAuto(700));
            recentMoviesWindow.addEventListener('pointerenter', event => {
                if (event.pointerType !== 'mouse') return;
                recentIsHovered = true;
                pauseRecentAuto();
            });
            recentMoviesWindow.addEventListener('pointerleave', () => {
                recentIsHovered = false;
                scheduleRecentAuto();
            });
            if ('IntersectionObserver' in window) {
                const moviesObserver = new IntersectionObserver(([entry]) => {
                    recentIsVisible = entry.isIntersecting;
                    if (recentIsVisible) startRecentAuto();
                    else pauseRecentAuto();
                }, { threshold: 0.1 });
                moviesObserver.observe(recentMoviesWindow);
            }
        }
        window.addEventListener('resize', () => {
            if (!recentMoviesWindow) return;
            syncRecentIndex();
            scrollRecentToIndex(recentCurrentIndex, false);
            checkRecentBoundaries();
            scheduleRecentAuto(300);
        });
        startRecentAuto();
    }

    const updatePauseButton = () => {
        if (!recentPauseButton) return;
        const paused = recentUserPaused || prefersReducedMotion;
        recentPauseButton.setAttribute('aria-pressed', String(paused));
        recentPauseButton.textContent = paused ? 'Pornește derularea' : 'Pauză derulare';
        recentPauseButton.disabled = prefersReducedMotion;
    };
    recentPauseButton?.addEventListener('click', () => {
        recentUserPaused = !recentUserPaused;
        if (recentUserPaused) pauseRecentAuto();
        else startRecentAuto();
        updatePauseButton();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) pauseRecentAuto();
        else startRecentAuto();
    });
    motionPreference.addEventListener('change', event => {
        prefersReducedMotion = event.matches;
        if (prefersReducedMotion) pauseRecentAuto();
        else startRecentAuto();
        updatePauseButton();
    });
    updatePauseButton();

    // WhatsApp chat interactions
    const whatsappBubble = document.getElementById('whatsapp-bubble');
    const whatsappWindow = document.getElementById('whatsapp-chat-window');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const sendMessageBtn = document.getElementById('send-whatsapp-message');
    const whatsappTextarea = document.getElementById('whatsapp-message');
    const whatsappNumber = '447449765468';
    const whatsappDefaultMessage = 'Salut! Sunt interesat de abonamentele Pixel Magix TV. Vreau să aflu detalii și să primesc un test gratuit de 36h. Mulțumesc!';

    const openWhatsAppWithMessage = (message = whatsappDefaultMessage) => {
        const finalMessage = (message || '').trim() || whatsappDefaultMessage;
        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(finalMessage)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const whatsappLinks = document.querySelectorAll('a[href^="https://wa.me/447449765468"]:not(.js-whatsapp-plan)');
    const defaultWhatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappDefaultMessage)}`;

    whatsappLinks.forEach(link => {
        try {
            const url = new URL(link.href);
            url.searchParams.set('text', whatsappDefaultMessage);
            link.href = url.toString();
        } catch (error) {
            link.href = defaultWhatsappUrl;
        }
    });

    whatsappBubble?.addEventListener('click', () => {
        if (whatsappWindow) {
            whatsappWindow.style.display = 'flex';
            whatsappBubble.setAttribute('aria-expanded', 'true');
            setDialogOpen(whatsappWindow, true);
            whatsappTextarea?.focus();
        }
    });

    const closeChat = () => {
        if (whatsappWindow) {
            setDialogOpen(whatsappWindow, false);
            whatsappWindow.style.display = 'none';
            whatsappBubble?.setAttribute('aria-expanded', 'false');
        }
    };
    closeChatBtn?.addEventListener('click', closeChat);
    whatsappWindow?.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeChat();
    });

    sendMessageBtn?.addEventListener('click', () => {
        if (!whatsappTextarea) return;
        const message = whatsappTextarea.value.trim();
        openWhatsAppWithMessage(message);
        whatsappTextarea.value = '';
        closeChat();
    });

    const planButtons = document.querySelectorAll('.js-whatsapp-plan');

    planButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const card = button.closest('.pricing-card');
            const planName = card?.querySelector('.plan-name')?.textContent.trim() || 'abonamentul Pixel Magix';
            const duration = card?.querySelector('.price-duration')?.textContent.trim() || '';
            const price = card?.querySelector('.price-value')?.textContent.trim() || '';
            const durationPart = duration ? ` (${duration})` : '';
            const pricePart = price ? ` la ${price}` : '';
            const message = `Salut! Vreau să activez pachetul ${planName}${durationPart}${pricePart}. Îmi puteți trimite detaliile și pașii de plată?`;
            openWhatsAppWithMessage(message);
        });
    });

    // Sidebar functionality
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');

    const openSidebar = () => {
        sidebar?.classList.add('active');
        overlay?.classList.add('active');
        hamburger?.setAttribute('aria-expanded', 'true');
        setDialogOpen(sidebar, true, overlay);
    };

    const closeSidebar = () => {
        setDialogOpen(sidebar, false);
        sidebar?.classList.remove('active');
        overlay?.classList.remove('active');
        hamburger?.setAttribute('aria-expanded', 'false');
    };

    hamburger?.addEventListener('click', openSidebar);
    overlay?.addEventListener('click', closeSidebar);
    sidebar?.querySelector('.close-btn')?.addEventListener('click', closeSidebar);
    sidebar?.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeSidebar();
    });
    window.matchMedia('(min-width: 1101px)').addEventListener('change', event => {
        if (event.matches && sidebar?.classList.contains('active')) closeSidebar();
    });

    const mobileLinks = sidebar?.querySelectorAll('a[href^="#"]');
    mobileLinks?.forEach(link => {
        link.addEventListener('click', closeSidebar);
    });

    // Navbar scroll behaviour
    const navbar = document.querySelector('.navbar');
    const scrollToTopBtn = document.querySelector('.scroll-to-top');
    let lastScrollTop = 0;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (navbar) {
            if (scrollTop > 60) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }

            if (scrollTop > lastScrollTop && scrollTop > 120) {
                navbar.classList.add('hidden');
            } else {
                navbar.classList.remove('hidden');
            }
        }

        if (scrollToTopBtn) {
            if (scrollTop > 480) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });

    scrollToTopBtn?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });

    // Smooth scroll for anchor links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            const targetId = link.getAttribute('href');
            if (!targetId || targetId === '#') return;
            const targetElement = document.getElementById(targetId.slice(1));
            if (!targetElement) return;

            event.preventDefault();
            targetElement.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            if (!targetElement.hasAttribute('tabindex')) targetElement.setAttribute('tabindex', '-1');
            targetElement.focus({ preventScroll: true });
        });
    });

    // Highlight install card based on devices tap/click
    const installSection = document.getElementById('instalare');
    const installCards = document.querySelectorAll('.install-card[data-install]');
    const deviceLinks = document.querySelectorAll('.devices-logos a[data-install-target]');
    const highlightDuration = 1800;

    const clearInstallHighlights = () => {
        installCards.forEach(card => card.classList.remove('highlight-install'));
    };

    const highlightInstallCard = (card) => {
        clearInstallHighlights();
        card.classList.add('highlight-install');
        window.setTimeout(() => card.classList.remove('highlight-install'), highlightDuration);
    };

    deviceLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            const targetKey = link.dataset.installTarget;
            const targetCard = targetKey ? document.querySelector(`.install-card[data-install="${targetKey}"]`) : null;

            if (installSection) {
                event.preventDefault();
                (targetCard || installSection).scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
            }

            if (targetCard) {
                window.setTimeout(() => highlightInstallCard(targetCard), 240);
            }
        });
    });

    // Require at least one contact method in the form + send via EmailJS
    const contactForm = document.querySelector('.contact-form form');
    const phoneInput = document.getElementById('telefon');
    const emailInput = document.getElementById('email');
    const nameInput = document.getElementById('nume');
    const countryInput = document.getElementById('tara');
    const providerInput = document.getElementById('furnizor');
    const messageInput = document.getElementById('mesaj');
    const honeypotInput = document.getElementById('website');
    const statusBox = document.querySelector('.form-status');
    const statusIcon = statusBox ? statusBox.querySelector('i') : null;
    const submitButton = contactForm ? contactForm.querySelector('button[type=\"submit\"]') : null;
    const emailClient = window.emailjs;
    const emailConfig = {
        serviceId: 'service_orxx2ov',
        templateId: 'template_0knsbj1',
        publicKey: 'AyXyYZ2ZGPHEsL38U'
    };
    const phoneUtilsUrl = 'https://cdn.jsdelivr.net/npm/intl-tel-input@25.12.4/build/js/utils.js';
    const defaultPhoneCountry = (() => {
        try {
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            const timezoneCountryMap = {
                'Europe/London': 'gb', 'Europe/Belfast': 'gb', 'Europe/Guernsey': 'gb', 'Europe/Jersey': 'gb', 'Europe/Isle_of_Man': 'gb',
                'Europe/Rome': 'it',
                'Europe/Madrid': 'es',
                'Europe/Berlin': 'de', 'Europe/Busingen': 'de',
                'Europe/Paris': 'fr',
                'Europe/Dublin': 'ie',
                'Europe/Brussels': 'be',
                'Europe/Amsterdam': 'nl',
                'Europe/Vienna': 'at',
                'Europe/Zurich': 'ch',
                'Europe/Lisbon': 'pt',
                'Europe/Athens': 'gr',
                'Europe/Stockholm': 'se',
                'Europe/Copenhagen': 'dk',
                'Europe/Oslo': 'no',
                'America/Toronto': 'ca', 'America/Montreal': 'ca', 'America/Edmonton': 'ca', 'America/Vancouver': 'ca', 'America/Winnipeg': 'ca', 'America/Halifax': 'ca',
                'America/New_York': 'us', 'America/Chicago': 'us', 'America/Denver': 'us', 'America/Los_Angeles': 'us', 'America/Phoenix': 'us', 'America/Detroit': 'us'
            };
            return timezoneCountryMap[timeZone] || 'ro';
        } catch (error) {
            return 'ro';
        }
    })();

    const initPhoneInput = () => {
        if (!phoneInput || typeof window.intlTelInput !== 'function') {
            if (phoneInput) {
                console.warn('intl-tel-input nu este disponibil.');
            }
            return null;
        }

        return window.intlTelInput(phoneInput, {
            initialCountry: defaultPhoneCountry,
            separateDialCode: true,
            nationalMode: true,
            showFlags: true,
            autoPlaceholder: 'aggressive',
            customPlaceholder: (selectedCountryPlaceholder) => `Ex. ${selectedCountryPlaceholder}`,
            formatAsYouType: true,
            countrySearch: true,
            countryOrder: ['ro', 'gb', 'it', 'es', 'de', 'fr', 'us', 'ca'],
            fixDropdownWidth: true,
            useFullscreenPopup: false,
            loadUtils: () => import(phoneUtilsUrl)
        });
    };

    const phoneIti = initPhoneInput();
    let phoneUtilsReady = false;
    if (phoneIti && phoneIti.promise) {
        phoneIti.promise.then(() => {
            phoneUtilsReady = true;
        }).catch(() => {
            phoneUtilsReady = false;
        });
    }

    const formatDate = () => {
        const now = new Date();
        const pad = (value) => String(value).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    };

    if (emailClient && typeof emailClient.init === 'function') {
        emailClient.init({ publicKey: emailConfig.publicKey });
    } else {
        console.warn('EmailJS SDK nu a fost încărcat.');
    }

    if (contactForm && phoneInput && emailInput) {
        let contactSending = false;
        const getPhoneValue = () => {
            const rawValue = phoneInput.value.trim();
            if (rawValue.length === 0) return '';
            if (phoneIti && phoneUtilsReady && typeof phoneIti.getNumber === 'function') {
                const fullNumber = phoneIti.getNumber();
                return fullNumber || rawValue;
            }
            const dialCode = phoneIti?.getSelectedCountryData()?.dialCode;
            if (rawValue.startsWith('+') || !dialCode) return rawValue;
            return `+${dialCode} ${rawValue}`;
        };

        const isPhoneValid = () => {
            const rawValue = phoneInput.value.trim();
            if (rawValue.length === 0) return false;
            if (phoneIti && phoneUtilsReady && typeof phoneIti.isValidNumber === 'function') {
                return phoneIti.isValidNumber();
            }
            return /^\+?[\d\s().-]{7,40}$/.test(rawValue) && rawValue.replace(/\D/g, '').length >= 7;
        };

        const validateContactFields = () => {
            const hasPhone = phoneInput.value.trim().length > 0;
            const hasEmail = emailInput.value.trim().length > 0;
            const helperText = 'Completează numărul de telefon (cu prefix) sau adresa de email.';
            let phoneError = '';
            let emailError = '';

            if (!hasPhone && !hasEmail) {
                phoneError = helperText;
                emailError = helperText;
            } else if (hasPhone && !isPhoneValid()) {
                phoneError = 'Numărul de telefon pare invalid.';
            }

            phoneInput.setCustomValidity(phoneError);
            emailInput.setCustomValidity(emailError);
        };

        let statusLockUntil = 0;

        const hideStatus = () => {
            if (!statusBox) return;
            if (Date.now() < statusLockUntil) return;
            statusBox.classList.remove('visible', 'error');
            statusBox.setAttribute('aria-hidden', 'true');
        };

        const showStatus = (message, isError = false) => {
            if (!statusBox) return;
            const textTarget = statusBox.querySelector('span');
            if (textTarget) {
                textTarget.textContent = message;
            } else {
                statusBox.textContent = message;
            }
            if (statusIcon) {
                statusIcon.className = isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
            }
            statusBox.classList.toggle('error', Boolean(isError));
            statusBox.classList.add('visible');
            statusBox.setAttribute('aria-hidden', 'false');
            statusLockUntil = Date.now() + 400;
            statusBox.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'nearest' });
        };

        const setSendingState = (isSending) => {
            contactSending = isSending;
            contactForm.setAttribute('aria-busy', String(isSending));
            if (!submitButton) return;
            submitButton.disabled = isSending;
            submitButton.textContent = isSending ? 'Se trimite...' : 'Trimite mesajul';
        };

        phoneInput.addEventListener('input', () => {
            hideStatus();
            validateContactFields();
        });
        if (phoneIti) {
            phoneInput.addEventListener('countrychange', () => {
                hideStatus();
                validateContactFields();
            });
        }
        emailInput.addEventListener('input', () => {
            hideStatus();
            validateContactFields();
        });

        const requiredFieldMessages = [
            [nameInput, 'Te rugăm să completezi numele.'],
            [countryInput, 'Te rugăm să completezi țara de reședință.']
        ];
        requiredFieldMessages.forEach(([field, message]) => {
            if (!field) return;
            field.addEventListener('invalid', () => {
                if (field.validity.valueMissing) {
                    field.setCustomValidity(message);
                }
            });
            field.addEventListener('input', () => field.setCustomValidity(''));
        });
        [providerInput, messageInput].forEach(field => {
            field?.addEventListener('input', () => field.setCustomValidity(''));
        });
        emailInput.addEventListener('invalid', () => {
            if (emailInput.validity.typeMismatch) {
                emailInput.setCustomValidity('Adresa de email nu pare validă (ex. nume@domeniu.com).');
            }
        });

        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (contactSending) return;
            hideStatus();
            validateContactFields();
            requiredFieldMessages.forEach(([field, message]) => {
                if (field) field.setCustomValidity(field.value.trim() ? '' : message);
            });
            // Also validate scripted/pasted values; HTML maxlength is only an editing aid.
            [nameInput, countryInput, providerInput, messageInput, phoneInput, emailInput].forEach(field => {
                if (field && field.maxLength > 0 && field.value.length > field.maxLength) {
                    field.setCustomValidity(`Folosește cel mult ${field.maxLength} de caractere.`);
                }
            });

            if (!contactForm.checkValidity()) {
                contactForm.reportValidity();
                return;
            }

            if (honeypotInput && honeypotInput.value.trim().length > 0) {
                return;
            }

            if (!emailClient || typeof emailClient.send !== 'function') {
                showStatus('Serviciul de email nu este disponibil acum. Te rugăm să ne scrii pe WhatsApp.', true);
                return;
            }

            setSendingState(true);

            const templateParams = {
                nume: nameInput?.value.trim() || '',
                email: emailInput.value.trim(),
                telefon: getPhoneValue(),
                tara: countryInput?.value.trim() || '',
                provider: providerInput?.value.trim() || '',
                mesaj: messageInput?.value.trim() || '',
                date: formatDate()
            };

            try {
                await emailClient.send(emailConfig.serviceId, emailConfig.templateId, templateParams);
                contactForm.reset();
                if (phoneIti) {
                    phoneIti.setNumber('');
                }
                phoneInput.setCustomValidity('');
                emailInput.setCustomValidity('');
                showStatus('Mulțumim! Formularul a fost trimis. Revenim cât mai rapid.');
            } catch (error) {
                console.error('Trimiterea formularului a eșuat.');
                showStatus('Nu am putut trimite mesajul. Încearcă din nou sau contactează-ne pe WhatsApp.', true);
            } finally {
                setSendingState(false);
            }
        });
    }

    // Newsletter subscription via EmailJS
    const newsletterForm = document.querySelector('.newsletter-form');
    const newsletterInput = newsletterForm ? newsletterForm.querySelector('input[type="email"]') : null;
    const newsletterButton = newsletterForm ? newsletterForm.querySelector('button[type="submit"]') : null;
    const newsletterStatus = document.querySelector('.newsletter-status');
    let newsletterSending = false;

    if (newsletterForm && newsletterInput && newsletterButton && newsletterStatus) {
        const setNewsletterMessage = (message, type = 'success') => {
            newsletterStatus.textContent = message;
            newsletterStatus.classList.remove('success', 'error');
            newsletterStatus.classList.add(type, 'visible');
        };

        const setNewsletterSending = (isSending) => {
            newsletterSending = isSending;
            newsletterButton.disabled = isSending;
            newsletterButton.innerHTML = isSending
                ? '<i class="fas fa-spinner fa-spin"></i>'
                : '<i class="fas fa-paper-plane"></i>';
        };

        newsletterForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (newsletterSending) return;

            const emailValue = newsletterInput.value.trim();
            if (!newsletterInput.checkValidity() || emailValue.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
                setNewsletterMessage('Adaugă un email valid ca să încheiem abonarea.', 'error');
                newsletterInput.focus();
                return;
            }

            if (!emailClient || typeof emailClient.send !== 'function') {
                setNewsletterMessage('Abonarea nu este disponibilă acum. Scrie-ne pe WhatsApp și te notăm noi.', 'error');
                return;
            }

            setNewsletterMessage('Se procesează abonarea...', 'success');
            setNewsletterSending(true);

            const templateParams = {
                nume: 'Abonare newsletter (site)',
                email: emailValue,
                telefon: '',
                tara: '',
                provider: '',
                mesaj: `Cerere abonare newsletter pentru: ${emailValue}`,
                date: formatDate()
            };

            try {
                await emailClient.send(emailConfig.serviceId, emailConfig.templateId, templateParams);
                setNewsletterMessage('Te-am notat! Revenim cu noutăți.', 'success');
                newsletterForm.reset();
            } catch (error) {
                console.error('Trimiterea abonării a eșuat.');
                setNewsletterMessage('Nu am putut înregistra abonarea. Încearcă din nou sau scrie-ne pe WhatsApp.', 'error');
            } finally {
                setNewsletterSending(false);
            }
        });
    }

    // Set current year in footer
    const currentYear = document.getElementById('current-year');
    if (currentYear) {
        currentYear.textContent = new Date().getFullYear().toString();
    }
});
