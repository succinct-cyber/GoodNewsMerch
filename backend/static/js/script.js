/* GoodNews Merch - Main JS */

$(document).ready(function () {

  /* --- Mobile Menu --- */
  $('#hamburger').on('click', function () {
    $('#mobileMenu').toggleClass('open');
    $(this).toggleClass('active');
  });

  // Close on outside click
  $(document).on('click', function (e) {
    if (!$(e.target).closest('.navbar').length) {
      $('#mobileMenu').removeClass('open');
      $('#hamburger').removeClass('active');
    }
  });

  /* --- Alerts auto-dismiss --- */
  setTimeout(function () {
    $('.alerts-container').fadeOut(400, function () { $(this).remove(); });
  }, 5000);

  /* --- Product image zoom on hover --- */
  $('.product-image-wrap').on('mouseenter', function () {
    $(this).find('.product-img').css('transform', 'scale(1.04)');
  }).on('mouseleave', function () {
    $(this).find('.product-img').css('transform', 'scale(1)');
  });

  /* --- Cart quantity: prevent navigation if stock 0 --- */
  $('.qty-plus').on('click', function (e) {
    const maxStock = $(this).data('stock');
    const currentQty = parseInt($(this).siblings('.qty-value').text());
    if (maxStock && currentQty >= maxStock) {
      e.preventDefault();
      showToast('Maximum stock reached.');
    }
  });

  /* --- Checkout form validation --- */
  $('#checkoutForm').on('submit', function (e) {
    const password = $('#newPwd').val();
    const confirm = $('#confirmPwd').val();
    if (password && confirm && password !== confirm) {
      e.preventDefault();
      showToast('Passwords do not match.');
    }
  });

});

/* --- Toast Notification --- */
function showToast(message, type = 'info') {
  const toast = $(`
    <div class="alert alert-${type}" style="position:fixed;bottom:24px;right:24px;z-index:9999;min-width:280px;">
      <span>${message}</span>
      <button class="alert-close" onclick="$(this).parent().remove()">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `);
  $('body').append(toast);
  setTimeout(() => toast.fadeOut(400, function () { $(this).remove(); }), 4000);
}
