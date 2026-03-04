/* Lightbox — full-page detail view for gallery images */
(function () {
  var container, lbImage, lbTitle, lbMeta, lbDesc, savedScrollY;

  function create() {
    container = document.createElement('div');
    container.className = 'lightbox-page';
    container.innerHTML =
      '<div class="lightbox-page-inner">' +
        '<a class="lightbox-back project-back" href="#">Back</a>' +
        '<img class="lightbox-img">' +
        '<div class="lightbox-info">' +
          '<p class="lightbox-title"></p>' +
          '<p class="lightbox-meta"></p>' +
          '<p class="lightbox-desc"></p>' +
        '</div>' +
      '</div>';

    lbImage = container.querySelector('.lightbox-img');
    lbTitle = container.querySelector('.lightbox-title');
    lbMeta = container.querySelector('.lightbox-meta');
    lbDesc = container.querySelector('.lightbox-desc');

    container.querySelector('.lightbox-back').addEventListener('click', function (e) {
      e.preventDefault();
      close();
    });

    document.body.appendChild(container);
  }

  function open(src, title, meta, desc) {
    if (!container) create();
    lbImage.src = src;
    lbTitle.textContent = title || '';
    lbMeta.textContent = meta || '';
    lbDesc.textContent = desc || '';
    lbTitle.style.display = title ? '' : 'none';
    lbMeta.style.display = meta ? '' : 'none';
    lbDesc.style.display = desc ? '' : 'none';

    savedScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    container.classList.add('visible');
    container.scrollTop = 0;
    requestAnimationFrame(function () {
      container.classList.add('active');
    });
  }

  function close() {
    if (!container) return;
    container.classList.remove('active');
    container.addEventListener('transitionend', function handler() {
      container.classList.remove('visible');
      container.removeEventListener('transitionend', handler);
      document.body.style.overflow = '';
      window.scrollTo(0, savedScrollY);
    });
  }

  document.addEventListener('click', function (e) {
    var image = e.target.closest('.gallery-item img');
    if (!image) return;
    // Skip images inside triptychs or links
    if (image.closest('.gallery-triptych') || image.closest('a')) return;

    var figure = image.closest('.gallery-item');
    var titleEl = figure.querySelector('.gallery-title');
    var metaEl = figure.querySelector('.gallery-meta');
    var descEl = figure.querySelector('.gallery-desc');

    open(
      image.src,
      titleEl ? titleEl.textContent : '',
      metaEl ? metaEl.textContent : '',
      descEl ? descEl.textContent : ''
    );
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
})();
