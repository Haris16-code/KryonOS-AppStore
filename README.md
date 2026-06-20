<h1>KryonOS App Store</h1>

<p>Welcome to the official KryonOS AppStore repository. This repository acts as the decentralized backend database powering the KryonOS App Store.</p>

<hr>

<h2>App Submission Guide</h2>

<p>Follow these steps to submit your application or game to the KryonOS ecosystem:</p>

<h3>Step 1: Fork the Repository</h3>
<p>Start by forking the official repository to your own GitHub account:</p>
<p><a href="https://github.com/Haris16-code/KryonOS-AppStore">Fork KryonOS-AppStore</a></p>
<p><strong>How to Fork:</strong> Click the <strong>"Fork"</strong> button at the top-right corner of the GitHub page, select your account, and click <strong>"Create fork"</strong>. Once created, clone your newly forked repository onto your local computer using your terminal or Git GUI client:</p>
<pre>git clone https://github.com/YOUR_USERNAME/KryonOS-AppStore.git</pre>

<h3>Step 2: Choose a Category</h3>
<p>Navigate inside your locally cloned <code>categories/</code> directory. Look through the existing folders to find the category that best matches your application or game (e.g., utilities, games).</p>

<h3>Step 3: Create Your App Folder</h3>
<p>Inside your chosen category folder, create a new subfolder. Use a clean, recognizable name for your folder that relates to your application.</p>
<p><em>Example:</em> <code>categories/utilities/YourAppName/</code></p>

<h3>Step 4: Add Your Application Files</h3>
<p>Inside your newly created application folder, you must include at least two core files:</p>
<ul>
    <li><code>main.js</code> — The main execution logic for your application or game.</li>
    <li><code>app.json</code> — The metadata manifest file.</li>
</ul>

<p>Your initial <code>app.json</code> should match this structure (fill in the fields to match your specific app or game):</p>
<pre>
{
  "name": "Your App Name Here",
  "packageName": "com.kryonos.yourappname",
  "version": "1.0.0",
  "metaUrl": "",
  "api": 1,
  "author": "Your Name/Team Name",
  "type": "App",
  "category": "Utility",
  "description": "A clear description of what your application or game does.",
  "changelog": "Initial release"
}
</pre>
<p><strong>Note on the name string:</strong> The value you put inside the <code>"name"</code> field is what the KryonOS App Store will automatically extract and display as the public title of your application or game on the store front.</p>
<p><strong>Note on api level:</strong> You must set the <code>"api"</code> integer value to match the API level required by your application. To find the current KryonOS API level, check the <a href="https://github.com/Haris16-code/KryonOS/blob/main/Documentation/JS_API_Guide.md">JavaScript API Guide</a>.</p>
<p><strong>Note on metaUrl:</strong> Leave the <code>"metaUrl"</code> field blank (<code>""</code>) or omit it. The automated system will automatically calculate and inject the correct raw URL for your application upon merge.</p>

<h3>Step 5: Test and Open a Pull Request</h3>
<p>Once you have thoroughly tested your application on KryonOS, follow these steps to submit your app to the main ecosystem repository:</p>
<ol>
    <li>
        <strong>Commit your changes:</strong> Save your app files, open your terminal inside the project directory, and stage your new folder:
        <pre>git add categories/</pre>
        Next, commit your changes with a clear message:
        <pre>git commit -m "feat: add YourAppName to app store"</pre>
    </li>
    <li>
        <strong>Push your changes:</strong> Push the committed files directly to your forked repository on GitHub:
        <pre>git push origin main</pre>
    </li>
    <li>
        <strong>Create the Pull Request:</strong> Go to the original <a href="https://github.com/Haris16-code/KryonOS-AppStore">KryonOS-AppStore repository</a> on GitHub. You will see a banner at the top showing your recent push with a button labeled <strong>"Compare & pull request"</strong>. Click it, describe your app briefly, and submit your Pull Request against our <code>main</code> branch.
    </li>
</ol>
<p>Once verified by our maintainers, your Pull Request will be merged, and your app will immediately go live on the KryonOS App Store.</p>

<hr>

<h2>How to Update Your App or Game</h2>

<p>When you want to release a new feature, bug fix, or update to an existing application, follow these steps:</p>

<ol>
    <li>Navigate to your existing application folder inside your forked repository.</li>
    <li>Modify your <code>main.js</code> file with your new code updates as desired.</li>
    <li>Open your <code>app.json</code> file and make the following critical updates:
        <ul>
            <li><strong>Increment the version:</strong> Increase the <code>"version"</code> string value (e.g., change from <code>"1.0.0"</code> to <code>"1.1.0"</code>). <em>Note: KryonOS uses this version bump to detect, fetch, and deliver the new update to users.</em></li>
            <li><strong>Update the changelog:</strong> Describe what changed in this version inside the <code>"changelog"</code> string field so users know what is new.</li>
            <li><strong>Verify API level:</strong> If your update uses newer system features, make sure to update the <code>"api"</code> level integer according to the latest API documentation.</li>
        </ul>
    </li>
    <li>Commit your changes, push them to your fork, and open a new Pull Request. Once merged, the store will immediately process the version increase and deploy the update.</li>
</ol>

<hr>

<h2>Developer Documentation</h2>

<p>Before writing code for KryonOS, please review the core development guides:</p>
<ul>
    <li><a href="https://github.com/Haris16-code/KryonOS/blob/main/Documentation/App_Development_Guide.md">App Development Guide</a> — Learn how to build and structure JavaScript applications for KryonOS.</li>
    <li><a href="https://github.com/Haris16-code/KryonOS/blob/main/Documentation/JS_API_Guide.md">JavaScript API Guide</a> — Learn how to access system hardware and verify system capabilities using KryonOS's JS API.</li>
</ul>
