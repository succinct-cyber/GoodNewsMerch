from rest_framework import serializers
from accounts.models import Account, UserProfile
from store.models import Product, Variation, ProductGallery, ReviewRating
from category.models import Category
from cart.models import Cart, CartItem
from orders.models import Order, OrderProduct, Payment


# ── Auth ──────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model  = Account
        fields = ['first_name', 'last_name', 'email', 'phone_number', 'password', 'confirm_password']

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        phone  = validated_data.pop('phone_number', '')
        # username derived from email prefix
        username = validated_data['email'].split('@')[0]
        user = Account.objects.create_user(
            username=username,
            **validated_data,
        )
        user.phone_number = phone
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Account
        fields = ['id', 'first_name', 'last_name', 'email', 'phone_number', 'username']


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model  = UserProfile
        fields = '__all__'


# ── Category ──────────────────────────────────────────────────

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = ['id', 'category_name', 'slug', 'description', 'cat_image']


# ── Store ─────────────────────────────────────────────────────

class VariationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Variation
        fields = ['id', 'variation_category', 'variation_value', 'price_modifier']


class ProductGallerySerializer(serializers.ModelSerializer):
    class Meta:
        model  = ProductGallery
        fields = ['id', 'image']


class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model  = ReviewRating
        fields = ['id', 'user', 'subject', 'review', 'rating', 'created_at', 'updated_at']
        read_only_fields = ['user']


class ProductListSerializer(serializers.ModelSerializer):
    category    = CategorySerializer(read_only=True)
    avg_review  = serializers.FloatField(source='avgReview', read_only=True)
    count_review= serializers.IntegerField(source='countReview', read_only=True)

    class Meta:
        model  = Product
        fields = ['id', 'product_name', 'slug', 'price', 'images',
                  'stock', 'is_available', 'category', 'avg_review', 'count_review']


class ProductDetailSerializer(serializers.ModelSerializer):
    category    = CategorySerializer(read_only=True)
    variations  = VariationSerializer(many=True, read_only=True, source='variation_set')
    gallery     = ProductGallerySerializer(many=True, read_only=True)
    avg_review  = serializers.FloatField(source='avgReview', read_only=True)
    count_review= serializers.IntegerField(source='countReview', read_only=True)

    class Meta:
        model  = Product
        fields = ['id', 'product_name', 'slug', 'description', 'price',
                  'images', 'stock', 'is_available', 'category',
                  'variations', 'gallery', 'avg_review', 'count_review']


# ── Cart ─────────────────────────────────────────────────────

class CartItemSerializer(serializers.ModelSerializer):
    product    = ProductListSerializer(read_only=True)
    variations = VariationSerializer(many=True, read_only=True)
    sub_total  = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model  = CartItem
        fields = ['id', 'product', 'variations', 'quantity', 'sub_total']


# ── Orders ───────────────────────────────────────────────────

class OrderProductSerializer(serializers.ModelSerializer):
    product    = ProductListSerializer(read_only=True)
    variations = VariationSerializer(many=True, read_only=True)

    class Meta:
        model  = OrderProduct
        fields = ['id', 'product', 'variations', 'quantity', 'product_price']


class OrderSerializer(serializers.ModelSerializer):
    products = OrderProductSerializer(many=True, read_only=True, source='orderproduct_set')

    class Meta:
        model  = Order
        fields = ['id', 'order_number', 'first_name', 'last_name', 'email',
                  'phone', 'address_line_1', 'address_line_2', 'city', 'state',
                  'country', 'order_note', 'order_total', 'shipping_fee', 'tax',
                  'status', 'delivery_option', 'is_ordered', 'created_at', 'products']