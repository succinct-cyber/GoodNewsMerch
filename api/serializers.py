from rest_framework import serializers
from store.models import Product, Variation, ReviewRating, ProductGallery
from category.models import Category
from cart.models import Cart, CartItem
from orders.models import Order, OrderProduct, Payment
from accounts.models import Account
from django.contrib.auth import authenticate


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = ['id', 'category_name', 'slug', 'description', 'cat_image']


class VariationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Variation
        fields = ['id', 'variation_category', 'variation_value', 'price_modifier']


class ProductGallerySerializer(serializers.ModelSerializer):
    class Meta:
        model  = ProductGallery
        fields = ['id', 'image']


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model  = ReviewRating
        fields = ['id', 'user_name', 'rating', 'subject', 'review', 'created_at']

    def get_user_name(self, obj):
        return f'{obj.user.first_name} {obj.user.last_name}'


class ProductListSerializer(serializers.ModelSerializer):
    category     = CategorySerializer(read_only=True)
    avg_rating   = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model  = Product
        fields = [
            'id', 'product_name', 'slug', 'category',
            'images', 'price', 'stock', 'is_available',
            'avg_rating', 'review_count', 'get_url',
        ]

    def get_avg_rating(self, obj):
        return obj.avgReview()

    def get_review_count(self, obj):
        return obj.countReview()


class ProductDetailSerializer(serializers.ModelSerializer):
    category   = CategorySerializer(read_only=True)
    variations = VariationSerializer(many=True, source='variation_set')
    gallery    = ProductGallerySerializer(many=True)
    reviews    = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()

    class Meta:
        model  = Product
        fields = [
            'id', 'product_name', 'slug', 'description',
            'category', 'images', 'price', 'stock',
            'is_available', 'variations', 'gallery',
            'avg_rating', 'reviews',
        ]

    def get_avg_rating(self, obj):
        return obj.avgReview()

    def get_reviews(self, obj):
        reviews = ReviewRating.objects.filter(product=obj, status=True)
        return ReviewSerializer(reviews, many=True).data


class CartItemSerializer(serializers.ModelSerializer):
    product    = ProductListSerializer(read_only=True)
    variations = VariationSerializer(many=True, read_only=True)
    sub_total  = serializers.SerializerMethodField()

    class Meta:
        model  = CartItem
        fields = ['id', 'product', 'variations', 'quantity', 'sub_total']

    def get_sub_total(self, obj):
        return obj.sub_total()


class OrderProductSerializer(serializers.ModelSerializer):
    product    = ProductListSerializer(read_only=True)
    variations = VariationSerializer(many=True, read_only=True)

    class Meta:
        model  = OrderProduct
        fields = ['id', 'product', 'variations', 'quantity', 'product_price', 'ordered']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Payment
        fields = ['payment_id', 'payment_method', 'amount_paid', 'status', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    items   = OrderProductSerializer(many=True, source='orderproduct_set', read_only=True)
    payment = PaymentSerializer(read_only=True)

    class Meta:
        model  = Order
        fields = [
            'id', 'order_number', 'first_name', 'last_name',
            'email', 'phone', 'address_line_1', 'address_line_2',
            'city', 'state', 'country', 'order_note',
            'order_total', 'tax', 'status', 'is_ordered',
            'payment', 'items', 'created_at',
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model  = Account
        fields = ['first_name', 'last_name', 'email', 'phone_number', 'password', 'confirm_password']

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError('Passwords do not match.')
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        email    = validated_data['email']
        username = email.split('@')[0]
        user     = Account.objects.create_user(
            username=username,
            password=password,
            **validated_data
        )
        return user


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)