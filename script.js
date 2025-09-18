
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

        const isUKVisitor = () => {
            if (typeof Intl === 'undefined') {
                return false;
            }

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

        applyCurrency(isUKVisitor() ? 'GBP' : 'EUR');
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
    const prevButton = document.querySelector('.slider-btn--prev');
    const nextButton = document.querySelector('.slider-btn--next');

    if (sliderTrack) {
        const slides = Array.from(sliderTrack.children);
        let currentIndex = 0;

        const computeMetrics = () => {
            if (slides.length === 0) {
                return { slideWidth: 0, gapValue: 0, maxIndex: 0 };
            }

            const slideWidth = slides[0].getBoundingClientRect().width;
            const trackStyles = window.getComputedStyle(sliderTrack);
            const gapValue = parseFloat(trackStyles.columnGap || trackStyles.gap || '0') || 0;
            const viewportWidth = sliderTrack.parentElement?.getBoundingClientRect().width || slideWidth;
            const visibleCount = Math.max(1, Math.floor((viewportWidth + gapValue) / (slideWidth + gapValue)));
            const maxIndex = Math.max(0, slides.length - visibleCount);

            return { slideWidth, gapValue, maxIndex };
        };

        const updateSlider = () => {
            const { slideWidth, gapValue, maxIndex } = computeMetrics();
            if (!slideWidth) return;

            currentIndex = Math.min(currentIndex, maxIndex);
            sliderTrack.style.transform = `translateX(-${currentIndex * (slideWidth + gapValue)}px)`;

            if (prevButton) prevButton.disabled = currentIndex === 0;
            if (nextButton) nextButton.disabled = currentIndex === maxIndex;
        };

        const goToSlide = (index) => {
            if (slides.length === 0) return;
            const { maxIndex } = computeMetrics();
            currentIndex = Math.min(Math.max(index, 0), maxIndex);
            updateSlider();
        };

        prevButton?.addEventListener('click', () => goToSlide(currentIndex - 1));
        nextButton?.addEventListener('click', () => goToSlide(currentIndex + 1));

        window.addEventListener('resize', () => {
            sliderTrack.style.transition = 'none';
            updateSlider();
            requestAnimationFrame(() => {
                sliderTrack.style.transition = '';
            });
        });

        updateSlider();
    }

    // WhatsApp chat interactions
    const whatsappBubble = document.getElementById('whatsapp-bubble');
    const whatsappWindow = document.getElementById('whatsapp-chat-window');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const sendMessageBtn = document.getElementById('send-whatsapp-message');
    const whatsappTextarea = document.getElementById('whatsapp-message');

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
        const url = `https://wa.me/972555171043?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        whatsappTextarea.value = '';
        whatsappWindow?.setAttribute('aria-hidden', 'true');
        if (whatsappWindow) {
            whatsappWindow.style.display = 'none';
        }
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

    // Custom cursor functionality
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');

    if (cursorDot && cursorOutline) {
        window.addEventListener('mousemove', (event) => {
            const { clientX, clientY } = event;
            cursorDot.style.transform = `translate(${clientX}px, ${clientY}px)`;
            cursorOutline.animate({
                transform: `translate(${clientX}px, ${clientY}px)`
            }, { duration: 350, fill: 'forwards' });
        });

        const interactiveElements = document.querySelectorAll('a, button, input, textarea');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => cursorOutline.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursorOutline.classList.remove('hover'));
        });
    }

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

    // Set current year in footer
    const currentYear = document.getElementById('current-year');
    if (currentYear) {
        currentYear.textContent = new Date().getFullYear().toString();
    }
});




