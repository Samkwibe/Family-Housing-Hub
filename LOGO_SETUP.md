# Logo Setup Instructions

## Where to Place Your Logo File

1. **Place your logo file in the `public` folder:**
   ```
   /public/logo.png
   ```

2. **File Requirements:**
   - **File Name:** Must be exactly `logo.png`
   - **Format:** PNG (recommended) or any image format (PNG, JPG, SVG)
   - **Resolution:** High resolution recommended (at least 200x200px for best quality)
   - **Background:** Transparent background recommended for best appearance

## How It Works

The logo will automatically appear in:
- **Top Navigation Bar** (in the app when logged in)
- **Landing Page Navigation** (when not logged in)
- **Landing Page Footer**

## Logo Variants

The logo component supports different sizes:
- **Default:** Full logo with text (used in main navigation)
- **Compact:** Smaller logo with text (used in landing page nav)
- **Icon Only:** Just the logo image (if needed)

## After Adding Your Logo

1. Place the file: `/public/logo.png`
2. The logo will automatically appear everywhere it's used
3. No code changes needed!

## Alternative File Names

If you want to use a different file name, update `src/components/Logo.jsx`:

Change this line:
```jsx
<img src="/logo.png" alt="Sam's Family Hub" />
```

To your file name:
```jsx
<img src="/your-logo-name.png" alt="Sam's Family Hub" />
```

## Testing

After adding your logo:
1. Run `npm run build`
2. Test locally with `npm start`
3. Verify the logo appears in:
   - Top navigation bar
   - Landing page navigation
   - Landing page footer

## Troubleshooting

**Logo not appearing?**
- Check file path is correct: `/public/logo.png`
- Verify file name is exactly `logo.png` (case-sensitive)
- Check browser console for 404 errors
- Ensure file is not corrupted

**Logo too large/small?**
- The logo automatically scales to fit
- For custom sizing, update the `className` in `Logo.jsx`
- Current sizes: `h-10` (compact), `h-12` (default)

**Logo looks blurry?**
- Use a higher resolution image (at least 2x the display size)
- Use PNG format for best quality
- Ensure the image is not compressed too much



