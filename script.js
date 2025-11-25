
document.addEventListener('DOMContentLoaded', () => {
    if (window.AOS) {
        AOS.init({
            duration: 900,
            once: true,
            offset: 60
        });
    }

    // Pricing toggle functionality
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const pricingGrids = document.querySelectorAll('.pricing-grid');

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.classList.contains('active')) return;

            toggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const plan = button.getAttribute('data-plan');
            const targetGrid = document.getElementById(`${plan}-plans`);

            pricingGrids.forEach(grid => {
                if (grid === targetGrid) {
                    grid.classList.add('active');
                } else {
                    grid.classList.remove('active');
                }
            });
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

        // Heuristic fallback (Timezone/Language)
        const checkHeuristic = () => {
            if (typeof Intl === 'undefined') return false;
            try {
                const languages = navigator.languages || [navigator.language];
                if (languages.some(lang => typeof lang === 'string' && lang.toLowerCase().includes('en-gb'))) {
                    return true;
                }
                const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
                return ['Europe/London', 'Europe/Belfast', 'Europe/Guernsey', 'Europe/Jersey', 'Europe/Isle_of_Man'].includes(timeZone);
            } catch (error) {
                return false;
            }
        };

        const detectLocation = async () => {
            // REPLACE 'YOUR_TOKEN_HERE' WITH YOUR IPINFO.IO API KEY
            // Example: const token = '1234567890abcdef';
            const token = 'b4bd4c28b8a326';

            try {
                const url = token ? `https://ipinfo.io/json?token=${token}` : 'https://ipinfo.io/json';
                const response = await fetch(url);
                if (!response.ok) throw new Error('IP check failed');

                const data = await response.json();
                return data.country === 'GB';
            } catch (error) {
                console.warn('IP geolocation failed, falling back to heuristics:', error);
                return checkHeuristic();
            }
        };

        // Initialize
        detectLocation().then(isUK => {
            applyCurrency(isUK ? 'GBP' : 'EUR');
        });
    }

    // FAQ accordion functionality
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const activeQuestion = document.querySelector('.faq-question.active');
            if (activeQuestion && activeQuestion !== question) {
                activeQuestion.classList.remove('active');
                const activeAnswer = activeQuestion.nextElementSibling;
                if (activeAnswer) {
                    activeAnswer.style.maxHeight = null;
                }
            }

            question.classList.toggle('active');
            const answer = question.nextElementSibling;

            if (question.classList.contains('active')) {
                if (answer) {
                    answer.style.maxHeight = `${answer.scrollHeight}px`;
                }
            } else if (answer) {
                answer.style.maxHeight = null;
            }
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
        const valueElement = element.querySelector('.stat-value');
        if (!valueElement) return;

        let current = 0;
        const duration = 1800;
        const stepTime = 20;
        const step = Math.max(Math.floor((targetValue * stepTime) / duration), 1);

        const counterInterval = setInterval(() => {
            current += step;
            if (current >= targetValue) {
                valueElement.textContent = targetValue.toLocaleString('ro-RO');
                clearInterval(counterInterval);
            } else {
                valueElement.textContent = current.toLocaleString('ro-RO');
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

    // Testimonials slider
    const sliderTrack = document.querySelector('.testimonials-track');
    const sliderWindow = document.querySelector('.testimonials-window');
    const prevButton = document.querySelector('.slider-btn--prev');
    const nextButton = document.querySelector('.slider-btn--next');

    if (sliderTrack && sliderWindow) {
        const slides = Array.from(sliderTrack.children);
        let snapPoints = [];
        let isDragging = false;
        let startX = 0;
        let startScrollLeft = 0;
        let lastScrollLeft = 0;
        let lastTimestamp = 0;
        let velocity = 0;
        let momentumFrame = null;
        let scrollSyncFrame = null;

        const stopMomentum = () => {
            if (momentumFrame) {
                cancelAnimationFrame(momentumFrame);
                momentumFrame = null;
            }
            sliderWindow.classList.remove('is-gliding');
        };

        const getMaxScroll = () => Math.max(0, sliderTrack.scrollWidth - sliderWindow.clientWidth);
        const clampScroll = (value) => Math.min(Math.max(value, 0), getMaxScroll());

        const rebuildSnapPoints = () => {
            const baseOffset = sliderTrack.offsetLeft;
            const maxScroll = getMaxScroll();
            snapPoints = [
                0,
                ...slides.map(slide => Math.round(slide.offsetLeft - baseOffset)),
                maxScroll
            ];
            snapPoints = [...new Set(snapPoints)].sort((a, b) => a - b);
        };

        const getNearestIndex = (current = sliderWindow.scrollLeft) => {
            if (snapPoints.length === 0) return 0;
            return snapPoints.reduce((nearest, point, index) => {
                return Math.abs(point - current) < Math.abs(snapPoints[nearest] - current) ? index : nearest;
            }, 0);
        };

        const syncButtons = () => {
            const maxScroll = getMaxScroll();
            const current = sliderWindow.scrollLeft;
            if (prevButton) prevButton.disabled = current <= 6;
            if (nextButton) nextButton.disabled = current >= maxScroll - 6;
        };

        const queueSyncButtons = () => {
            if (scrollSyncFrame) return;
            scrollSyncFrame = requestAnimationFrame(() => {
                syncButtons();
                scrollSyncFrame = null;
            });
        };

        const snapToNearest = () => {
            if (snapPoints.length === 0) return;
            const nearest = getNearestIndex();
            const target = clampScroll(snapPoints[nearest]);
            sliderWindow.scrollTo({ left: target, behavior: 'smooth' });
            syncButtons();
        };

        const scrollByStep = (direction) => {
            stopMomentum();
            rebuildSnapPoints();
            if (snapPoints.length === 0) return;
            const currentIndex = getNearestIndex();
            const targetIndex = Math.min(Math.max(currentIndex + direction, 0), snapPoints.length - 1);
            const target = clampScroll(snapPoints[targetIndex]);
            sliderWindow.scrollTo({ left: target, behavior: 'smooth' });
            syncButtons();
        };

        prevButton?.addEventListener('click', () => scrollByStep(-1));
        nextButton?.addEventListener('click', () => scrollByStep(1));

        const startMomentumScroll = () => {
            stopMomentum();
            sliderWindow.classList.add('is-gliding');
            const friction = 0.94;
            const minVelocity = 0.005;
            const maxScroll = getMaxScroll();
            let currentVelocity = Math.max(Math.min(velocity, 3.5), -3.5);
            let lastTime = performance.now();

            const step = (now) => {
                const deltaTime = now - lastTime;
                lastTime = now;
                sliderWindow.scrollLeft = clampScroll(sliderWindow.scrollLeft + currentVelocity * deltaTime);
                currentVelocity *= friction;

                const atEdge = sliderWindow.scrollLeft <= 0 || sliderWindow.scrollLeft >= maxScroll;
                if (atEdge || Math.abs(currentVelocity) < minVelocity) {
                    stopMomentum();
                    snapToNearest();
                    return;
                }

                queueSyncButtons();
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
                snapToNearest();
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
            rebuildSnapPoints();
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
            sliderWindow.scrollLeft = clampScroll(startScrollLeft - delta);

            const now = performance.now();
            const elapsed = now - lastTimestamp;
            if (elapsed > 0) {
                const currentScroll = sliderWindow.scrollLeft;
                velocity = (currentScroll - lastScrollLeft) / elapsed;
                lastScrollLeft = currentScroll;
                lastTimestamp = now;
            }
        });

        ['pointerup', 'pointerleave', 'pointercancel'].forEach(type => {
            sliderWindow.addEventListener(type, endDrag);
        });

        sliderWindow.addEventListener('scroll', queueSyncButtons, { passive: true });
        window.addEventListener('resize', () => {
            stopMomentum();
            rebuildSnapPoints();
            sliderWindow.scrollLeft = clampScroll(sliderWindow.scrollLeft);
            syncButtons();
        });
        rebuildSnapPoints();
        syncButtons();
    }

    // WhatsApp chat interactions
    const whatsappBubble = document.getElementById('whatsapp-bubble');
    const whatsappWindow = document.getElementById('whatsapp-chat-window');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const sendMessageBtn = document.getElementById('send-whatsapp-message');
    const whatsappTextarea = document.getElementById('whatsapp-message');
    const whatsappNumber = '972555171043';
    const whatsappDefaultMessage = 'Salut! Sunt interesat de abonamentele Pixel Magix TV. Vreau sa aflu detalii si sa primesc un test gratuit de 24h. Multumesc!';

    const openWhatsAppWithMessage = (message = whatsappDefaultMessage) => {
        const finalMessage = (message || '').trim() || whatsappDefaultMessage;
        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(finalMessage)}`;
        window.open(url, '_blank');
    };

    const whatsappLinks = document.querySelectorAll('a[href^="https://wa.me/972555171043"]:not(.js-whatsapp-plan)');
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
            whatsappWindow.setAttribute('aria-hidden', 'false');
        }
    });

    closeChatBtn?.addEventListener('click', () => {
        if (whatsappWindow) {
            whatsappWindow.style.display = 'none';
            whatsappWindow.setAttribute('aria-hidden', 'true');
        }
    });

    sendMessageBtn?.addEventListener('click', () => {
        if (!whatsappTextarea) return;
        const message = whatsappTextarea.value.trim();
        if (message.length === 0) return;
        openWhatsAppWithMessage(message);
        whatsappTextarea.value = '';
        whatsappWindow?.setAttribute('aria-hidden', 'true');
        if (whatsappWindow) {
            whatsappWindow.style.display = 'none';
        }
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
            const message = `Salut! Vreau sa activez pachetul ${planName}${durationPart}${pricePart}. Imi puteti trimite detaliile si pasii de plata?`;
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
        document.body.style.overflow = 'hidden';
    };

    const closeSidebar = () => {
        sidebar?.classList.remove('active');
        overlay?.classList.remove('active');
        document.body.style.overflow = '';
    };

    hamburger?.addEventListener('click', openSidebar);
    overlay?.addEventListener('click', closeSidebar);
    sidebar?.querySelector('.close-btn')?.addEventListener('click', closeSidebar);

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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Smooth scroll for anchor links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            const targetId = link.getAttribute('href');
            if (!targetId || targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (!targetElement) return;

            event.preventDefault();
            targetElement.scrollIntoView({ behavior: 'smooth' });
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
        const validateContactFields = () => {
            const hasPhone = phoneInput.value.trim().length > 0;
            const hasEmail = emailInput.value.trim().length > 0;
            const helperText = 'Completează numărul de telefon (cu prefix) sau adresa de email.';

            if (!hasPhone && !hasEmail) {
                phoneInput.setCustomValidity(helperText);
                emailInput.setCustomValidity(helperText);
            } else {
                phoneInput.setCustomValidity('');
                emailInput.setCustomValidity('');
            }
        };

        const hideStatus = () => {
            if (!statusBox) return;
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
        };

        const setSendingState = (isSending) => {
            if (!submitButton) return;
            submitButton.disabled = isSending;
            submitButton.textContent = isSending ? 'Se trimite...' : 'Trimite mesajul';
        };

        phoneInput.addEventListener('input', () => {
            hideStatus();
            validateContactFields();
        });
        emailInput.addEventListener('input', () => {
            hideStatus();
            validateContactFields();
        });

        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            hideStatus();
            validateContactFields();

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
                telefon: phoneInput.value.trim(),
                tara: countryInput?.value.trim() || '',
                provider: providerInput?.value.trim() || '',
                mesaj: messageInput?.value.trim() || '',
                date: formatDate()
            };

            try {
                await emailClient.send(emailConfig.serviceId, emailConfig.templateId, templateParams);
                showStatus('Mulțumim! Formularul a fost trimis. Revenim cât mai rapid.');
                contactForm.reset();
                phoneInput.setCustomValidity('');
                emailInput.setCustomValidity('');
            } catch (error) {
                console.error('EmailJS error:', error);
                showStatus('Nu am putut trimite mesajul. Încearcă din nou sau contactează-ne pe WhatsApp.', true);
            } finally {
                setSendingState(false);
            }
        });
    }

    // Newsletter fake confirmation message
    const newsletterForm = document.querySelector('.newsletter-form');
    const newsletterInput = newsletterForm ? newsletterForm.querySelector('input[type="email"]') : null;
    const newsletterButton = newsletterForm ? newsletterForm.querySelector('button[type="submit"]') : null;
    const newsletterStatus = document.querySelector('.newsletter-status');
    let newsletterTimeout = null;

    if (newsletterForm && newsletterInput && newsletterButton && newsletterStatus) {
        const setNewsletterMessage = (message, type = 'success') => {
            newsletterStatus.textContent = message;
            newsletterStatus.classList.remove('success', 'error');
            newsletterStatus.classList.add(type, 'visible');
        };

        const setNewsletterSending = (isSending) => {
            newsletterButton.disabled = isSending;
            newsletterButton.innerHTML = isSending
                ? '<i class="fas fa-spinner fa-spin"></i>'
                : '<i class="fas fa-paper-plane"></i>';
        };

        newsletterForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const emailValue = newsletterInput.value.trim();
            if (newsletterTimeout) {
                clearTimeout(newsletterTimeout);
                newsletterTimeout = null;
            }

            if (emailValue.length === 0 || !emailValue.includes('@')) {
                setNewsletterMessage('Adaug\u0103 un email valid ca s\u0103 \u00eencheiem abonarea.', 'error');
                newsletterInput.focus();
                return;
            }

            setNewsletterMessage('Se proceseaz\u0103 abonarea...', 'success');
            setNewsletterSending(true);

            newsletterTimeout = window.setTimeout(() => {
                setNewsletterMessage('Gata! Am trimis o confirmare (demo) \u00een inbox. Mul\u021bumim!', 'success');
                newsletterForm.reset();
                setNewsletterSending(false);
            }, 900);
        });
    }

    // Set current year in footer
    const currentYear = document.getElementById('current-year');
    if (currentYear) {
        currentYear.textContent = new Date().getFullYear().toString();
    }
});




