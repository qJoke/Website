document.addEventListener('DOMContentLoaded', function() {

    // Initialize AOS (Animate on Scroll)
    AOS.init({
        duration: 1000, // Animation duration
        once: true,     // Whether animation should happen only once
    });

    // Pricing Toggle Functionality
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const pricingGrids = document.querySelectorAll('.pricing-grid');

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.classList.contains('active')) return;

            // Update active button state
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Get the plan to show
            const planToShow = button.getAttribute('data-plan');
            const gridToShow = document.getElementById(`${planToShow}-plans`);
            const currentGrid = document.querySelector('.pricing-grid.active');

            if (currentGrid) {
                currentGrid.classList.remove('active');
            }
            
            setTimeout(() => {
                pricingGrids.forEach(grid => {
                    grid.style.display = 'none';
                });
                
                if (gridToShow) {
                    gridToShow.style.display = 'grid';
                    setTimeout(() => {
                        gridToShow.classList.add('active');
                    }, 50);
                }
            }, 500);
        });
    });

    // FAQ Accordion Functionality
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const currentlyActive = document.querySelector('.faq-question.active');
            if (currentlyActive && currentlyActive !== question) {
                currentlyActive.classList.remove('active');
                currentlyActive.nextElementSibling.style.maxHeight = 0;
            }

            question.classList.toggle('active');
            const answer = question.nextElementSibling;
            if (question.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            } else {
                answer.style.maxHeight = 0;
            }
        });
    });

    // Infinite Scroller for Movie Showcase
    const scrollers = document.querySelectorAll(".scroller");

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        addAnimation();
    }

    function addAnimation() {
        scrollers.forEach((scroller) => {
            scroller.setAttribute("data-animated", true);

            const scrollerInner = scroller.querySelector(".scroller__inner");
            const scrollerContent = Array.from(scrollerInner.children);

            scrollerContent.forEach((item) => {
                const duplicatedItem = item.cloneNode(true);
                duplicatedItem.setAttribute("aria-hidden", true);
                scrollerInner.appendChild(duplicatedItem);
            });
        });
    }

    // WhatsApp Chat Bubble Functionality
    const whatsappBubble = document.getElementById('whatsapp-bubble');
    const whatsappChatWindow = document.getElementById('whatsapp-chat-window');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const sendMessageBtn = document.getElementById('send-whatsapp-message');
    const messageTextarea = document.getElementById('whatsapp-message');

    if (whatsappBubble) {
        whatsappBubble.addEventListener('click', () => {
            whatsappChatWindow.style.display = 'flex';
        });
    }

    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            whatsappChatWindow.style.display = 'none';
        });
    }

    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', () => {
            const message = messageTextarea.value;
            if (message.trim() !== '') {
                const whatsappUrl = `https://wa.me/972555171043?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
                messageTextarea.value = '';
                whatsappChatWindow.style.display = 'none';
            }
        });
    }

    // Sidebar Functionality
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    const closeBtn = document.querySelector('.sidebar .close-btn');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // Custom Cursor Functionality
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');

    window.addEventListener('mousemove', function(e) {
        const posX = e.clientX;
        const posY = e.clientY;

        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;

        cursorOutline.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 500, fill: 'forwards' });
    });

    const links = document.querySelectorAll('a, button');
    links.forEach(link => {
        link.addEventListener('mouseenter', () => {
            cursorOutline.classList.add('hover');
        });
        link.addEventListener('mouseleave', () => {
            cursorOutline.classList.remove('hover');
        });
    });

    // Navbar scroll animation
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;
    const scrollThreshold = 50; // Pixels to scroll before changing navbar style
    let allowHide = true;
    let scrollEndTimeout;

    window.addEventListener('scroll', function() {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Add/remove navbar-scrolled class
        if (scrollTop > scrollThreshold) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }

        // Hide/show navbar logic
        if (allowHide) {
            if (scrollTop > lastScrollTop && scrollTop > scrollThreshold) {
                // Scroll Down
                navbar.classList.add('hidden');
            } else {
                // Scroll Up
                navbar.classList.remove('hidden');
            }
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling

        // Detect when scrolling has stopped
        clearTimeout(scrollEndTimeout);
        scrollEndTimeout = setTimeout(() => {
            allowHide = true;
        }, 150); // After 150ms of no scrolling, re-enable hiding
    });

    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Prevent navbar from hiding during programmatic scroll
            allowHide = false;
            navbar.classList.remove('hidden');

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
