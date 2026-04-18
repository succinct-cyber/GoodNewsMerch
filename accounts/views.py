from django.shortcuts import render, redirect, get_object_or_404

from accounts.utils import send_email_via_sendgrid
from .forms import RegistrationForm, UserForm, UserProfileForm
from .models import Account, UserProfile
from orders.models import Order, OrderProduct
from django.contrib import messages, auth
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse

# Verification email
from django.contrib.sites.shortcuts import get_current_site
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMessage

from cart.views import _cart_id
from cart.models import Cart, CartItem
import logging
import smtplib
import requests
from accounts.models import UserProfile

logger = logging.getLogger(__name__)

# Create your views here.
def register(request):
    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            first_name   = form.cleaned_data['first_name']
            last_name    = form.cleaned_data['last_name']
            phone_number = form.cleaned_data['phone_number']
            email        = form.cleaned_data['email']
            password     = form.cleaned_data['password']
            username     = email.split("@")[0]

            user = Account.objects.create_user(
                first_name=first_name,
                last_name=last_name,
                email=email,
                username=username,
                password=password
            )
            user.phone_number = phone_number
            user.save()

            # Create user profile
            UserProfile.objects.get_or_create(user=user)

            # Send verification email
            try:
                current_site = get_current_site(request)
                mail_subject = 'Please activate your account'
                message = render_to_string(
                    'accounts/account_verification_email.html',
                    {
                        'user':   user,
                        'domain': current_site.domain,
                        'uid':    urlsafe_base64_encode(force_bytes(user.pk)),
                        'token':  default_token_generator.make_token(user),
                    }
                )
            
                send_email = EmailMessage(mail_subject, message, to=[email])
                send_email.content_subtype = 'html'
                send_email.send()

                messages.success(request,
                    f'We sent a verification email to {email}. Please verify it.'
                )
            except Exception as e:
                logger.warning('Verification email failed: %s', e, exc_info=True)
                messages.error(
                    request,
                    'We could not send the verification email. Check your internet connection, firewall, and EMAIL_* settings, then try again.',
                )
            return redirect(f'/accounts/login/?command=verification&email={email}')
        else:
            print(form.errors)
            messages.error(request, 'Please correct the errors below.')
    else:
        form = RegistrationForm()

    return render(request, 'accounts/register.html', {'form': form})


def login(request):
    if request.method == 'POST':
        email    = request.POST['email']
        password = request.POST['password']
        user     = auth.authenticate(email=email, password=password)

        if user is not None:
            # ── Merge anonymous cart into user account ──────────
            try:
                cart            = Cart.objects.get(cart_id=_cart_id(request))
                anon_cart_items = CartItem.objects.filter(cart=cart)

                for anon_item in anon_cart_items:
                    anon_vars = sorted(
                        anon_item.variations.values_list('id', flat=True)
                    )

                    # Check if user already has same product + same variations
                    matched = False
                    for user_item in CartItem.objects.filter(user=user, product=anon_item.product):
                        user_vars = sorted(
                            user_item.variations.values_list('id', flat=True)
                        )
                        if user_vars == anon_vars:
                            # Exact match — just add quantities
                            user_item.quantity += anon_item.quantity
                            user_item.save()
                            anon_item.delete()  # remove the anon duplicate
                            matched = True
                            break

                    if not matched:
                        # No matching combo — transfer item to user
                        anon_item.user = user
                        anon_item.cart = None
                        anon_item.save()

            except Cart.DoesNotExist:
                pass
            # ───────────────────────────────────────────────────

            auth.login(request, user)
            messages.success(request, 'You are now logged in.')

            url = request.META.get('HTTP_REFERER')
            try:
                query  = requests.utils.urlparse(url).query
                params = dict(x.split('=') for x in query.split('&'))
                if 'next' in params:
                    return redirect(params['next'])
            except:
                pass
            return redirect('dashboard')

        else:
            messages.error(request, 'Invalid login credentials')
            return redirect('login')

    return render(request, 'accounts/login.html')


@login_required(login_url = 'login')
def logout(request):
    auth.logout(request)
    messages.success(request, 'You are logged out.')
    return redirect('login')

def activate(request, uidb64, token):
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = Account._default_manager.get(pk=uid)
    except(TypeError, ValueError, OverflowError, Account.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        user.is_active = True
        user.save()
        messages.success(request, 'Congratulations! Your account is activated.')
        return redirect('login')
    else:
        messages.error(request, 'Invalid activation link')
        return redirect('register')
    

@login_required(login_url='login')
def dashboard(request):
    base_orders = Order.objects.filter(
        user_id=request.user.id,
        is_ordered=True,
    ).order_by('-created_at')

    # Completed is determined by successful payment verification.
    # (Paid orders were previously showing up as pending because order.status
    # wasn't being set in the payment-success flow.)
    completed_orders = base_orders.filter(payment__status='success').order_by('-created_at')
    pending_orders = base_orders.exclude(payment__status='success').order_by('-created_at')
    recent_orders = list(completed_orders) + list(pending_orders)

    orders_count = base_orders.count()

    # get_or_create — never crashes if profile missing
    userprofile, created = UserProfile.objects.get_or_create(
        user=request.user,
        defaults={'profile_picture': ''}
    )

    context = {
        'orders_count': orders_count,
        'completed_orders': completed_orders,
        'pending_orders': pending_orders,
        'recent_orders': recent_orders,
        'userprofile' : userprofile,
    }
    return render(request, 'accounts/dashboard.html', context)


def forgot_password(request):
    if request.method == 'POST':
        email = request.POST['email']
        if Account.objects.filter(email=email).exists():
            user = Account.objects.get(email__exact=email)

            # Reset password email
            current_site = get_current_site(request)
            mail_subject = 'Reset Your Password'
            message = render_to_string('accounts/reset_password_email.html', {
                'user': user,
                'domain': current_site.domain,
                'uidb64': urlsafe_base64_encode(force_bytes(user.pk)),
                'token': default_token_generator.make_token(user),
            })
            to_email = email
            send_email = EmailMessage(mail_subject, message, to=[to_email])
            send_email.content_subtype = 'html'
            try:
                send_email.send()
            except (TimeoutError, OSError, smtplib.SMTPException) as exc:
                logger.warning('Password reset email failed: %s', exc, exc_info=True)
                messages.error(
                    request,
                    'We could not reach the mail server to send the reset link. '
                    'Check your internet connection, firewall, and EMAIL_* settings, then try again.',
                )
                return redirect('forgot_password')

            messages.success(request, 'Password reset email has been sent to your email address.')
            return redirect('login')
        else:
            messages.error(request, 'Account does not exist!')
            return redirect('forgot_password')
    return render(request, 'accounts/forgot-password.html')


def reset_password_confirm(request, uidb64, token):
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = Account._default_manager.get(pk=uid)
    except(TypeError, ValueError, OverflowError, Account.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        request.session['uid'] = uid
        messages.success(request, 'Please reset your password')
        return redirect('reset_password', uidb64=uidb64, token=token)
    else:
        context = {
            'uidb64': uidb64,
            'token': token,
        }
        messages.error(request, 'This link is expired!')
        return redirect('login')


def reset_password(request, uidb64, token):
    if request.method == 'POST':
        password = request.POST['password']
        confirm_password = request.POST['confirm_password']

        if password == confirm_password:
            try:
                uid = urlsafe_base64_decode(uidb64).decode()
                user = Account.objects.get(pk=uid)
                user.set_password(password)
                user.save()
                messages.success(request, 'Password reset successful')
                return redirect('login')
                
            except(TypeError, ValueError, OverflowError, Account.DoesNotExist):
                messages.error(request, 'This link has been expired!')
                return redirect('forgot_password')
        else:
            messages.error(request, 'Password do not match!')
            return redirect('reset_password', uidb64=uidb64, token=token)
    else:
        context = {
            'uidb64': uidb64,
            'token': token,
        }

        return render(request, 'accounts/reset-password.html', context)


@login_required(login_url='login')
def my_orders(request):
    orders = Order.objects.filter(user=request.user, is_ordered=True).order_by('-created_at')
    context = {
        'orders': orders,
    }
    return render(request, 'accounts/my_orders.html', context)


@login_required(login_url='login')
def edit_profile(request):
    userprofile, created = UserProfile.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        user_form = UserForm(request.POST, instance=request.user)
        profile_form = UserProfileForm(request.POST, request.FILES, instance=userprofile)
        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, 'Your profile has been updated.')
            return redirect('edit_profile')
    else:
        user_form = UserForm(instance=request.user)
        profile_form = UserProfileForm(instance=userprofile)
    context = {
        'user_form': user_form,
        'profile_form': profile_form,
        'userprofile': userprofile,
    }
    return render(request, 'accounts/edit_profile.html', context)


@login_required(login_url='login')
def change_password(request):
    if request.method == 'POST':
        current_password = request.POST['current_password']
        new_password = request.POST['new_password']
        confirm_password = request.POST['confirm_password']

        user = Account.objects.get(username__exact=request.user.username)

        if new_password == confirm_password:
            success = user.check_password(current_password)
            if success:
                user.set_password(new_password)
                user.save()
                # auth.logout(request)
                messages.success(request, 'Password updated successfully.')
                return redirect('change_password')
            else:
                messages.error(request, 'Please enter valid current password')
                return redirect('change_password')
        else:
            messages.error(request, 'Password does not match!')
            return redirect('change_password')
    return render(request, 'accounts/change_password.html')


@login_required(login_url='login')
def order_details(request, order_id):
    order_detail = (
        OrderProduct.objects.filter(
            order__order_number=order_id,
            order__user=request.user,
        )
        .select_related('product')
        .prefetch_related('variations')
    )
    order = get_object_or_404(Order, order_number=order_id, user=request.user)
    subtotal = 0
    for i in order_detail:
        subtotal += i.product_price * i.quantity

    context = {
        'order_detail': order_detail,
        'order': order,
        'subtotal': subtotal,
    }
    return render(request, 'accounts/order_details.html', context)