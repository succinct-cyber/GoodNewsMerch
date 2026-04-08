from django import forms

from .models import ProductGallery, ReviewRating, Variation


class ReviewForm(forms.ModelForm):
    class Meta:
        model = ReviewRating
        fields = ['subject', 'review', 'rating']


class VariationInlineForm(forms.ModelForm):
    """
    Admin inline: avoid Django selecting the first category by default, which makes
    'empty' rows look filled and triggers invalid INSERTs / FK churn.
    """

    class Meta:
        model = Variation
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['variation_category'].choices = [
            ('', '---------'),
            *Variation.VARIATION_CATEGORY_CHOICES,
        ]

    def clean(self):
        cleaned = super().clean()
        if cleaned.get('DELETE'):
            return cleaned
        cat = cleaned.get('variation_category')
        val = (cleaned.get('variation_value') or '').strip()
        if not cat and not val:
            if self.instance.pk:
                raise forms.ValidationError(
                    'Use the delete checkbox to remove this variation, or fill both fields.'
                )
            return cleaned
        if cat and not val:
            raise forms.ValidationError(
                {'variation_value': 'Enter a value (e.g. White, L, Standard).'}
            )
        if val and not cat:
            raise forms.ValidationError(
                {'variation_category': 'Choose whether this is a color, size, or quality.'}
            )
        return cleaned


class ProductGalleryInlineForm(forms.ModelForm):

    class Meta:
        model = ProductGallery
        fields = '__all__'