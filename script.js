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
            // Update active button state
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Get the plan to show
            const planToShow = button.getAttribute('data-plan');

            // Show the selected plan and hide the other
            pricingGrids.forEach(grid => {
                if (grid.id === `${planToShow}-plans`) {
                    grid.classList.add('active');
                } else {
                    grid.classList.remove('active');
                }
            });
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
});
