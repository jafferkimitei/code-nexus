import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [repoName, setRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [includeReadme, setIncludeReadme] = useState(false);
  const [files, setFiles] = useState([]);
  const [releaseTag, setReleaseTag] = useState('');
  const [repositories, setRepositories] = useState([]);
  const [filteredRepositories, setFilteredRepositories] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const reposPerPage = 5;

  useEffect(() => {
    if (username) {
      fetchUserStats();
      fetchRepositories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'username') setUsername(value);
    if (name === 'token') setToken(value);
    if (name === 'repoName') setRepoName(value);
    if (name === 'releaseTag') setReleaseTag(value);
  };

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    if (name === 'isPrivate') setIsPrivate(checked);
    if (name === 'includeReadme') setIncludeReadme(checked);
  };

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));
  };

  const removeFile = (fileToRemove) => {
    const updatedFiles = files.filter(file => file !== fileToRemove);
    setFiles(updatedFiles);
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    fetchUserStats();
    fetchRepositories();
  };

  const handleRepoSubmit = async (event) => {
    event.preventDefault();
    createRepository();
  };

  const fetchRepositories = async () => {
    try {
      const response = await fetch(`https://cod3-nexus-api.onrender.com/api/user/${username}/repos`);
      const data = await response.json();
      setRepositories(data);
      setFilteredRepositories(data);
    } catch (error) {
      setMessage('Error fetching repositories');
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch(`https://cod3-nexus-api.onrender.com/api/user/${username}`);
      const data = await response.json();
      setUserStats(data);
    } catch (error) {
      setMessage('Error fetching user statistics');
    }
  };


  const createRepository = async () => {
    try {
      const response = await fetch(`https://cod3-nexus-api.onrender.com/api/repos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          repoName: repoName,
          isPrivate: isPrivate,
          includeReadme: includeReadme
        })
      });
  
      if (response.ok) {
        const repoData = await response.json();
        if (files.length > 0) {
          for (let file of files) {
            await uploadFile(repoData.full_name, file);
          }
          await updateReadmeWithFiles(repoData.full_name);
        }
        if (releaseTag) {
          await markRelease(repoData.full_name);
        }
        setMessage('Repository created successfully');
        fetchRepositories();
      } else {
        setMessage('Error creating repository');
      }
    } catch (error) {
      setMessage('Error creating repository');
    }
  };

  const uploadFile = async (repoFullName, file) => {
    const content = await toBase64(file);

    try {
      const response = await fetch(`https://cod3-nexus-api.onrender.com/repos/${repoFullName}/contents/${file.name}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Add ${file.name}`,
          content: content,
          branch: "main"
        })
      });

      if (!response.ok) {
        setMessage(`Error uploading file: ${file.name}`);
      }
    } catch (error) {
      setMessage(`Error uploading file: ${file.name}`);
    }
  };

  const updateReadmeWithFiles = async (repoFullName) => {
    let readmeContent = `# ${repoName}\n\nThis repository was created using the GitHub API.\n\n## Files\n\n`;
    for (let file of files) {
      readmeContent += `- [${file.name}](./${file.name})\n`;
    }
    const content = btoa(readmeContent);

    try {
      const response = await fetch(`https://cod3-nexus-api.onrender.com/repos/${repoFullName}/contents/README.md`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: "Update README.md with file links",
          content: content,
          branch: "main"
        })
      });

      if (!response.ok) {
        setMessage('Error updating README.md');
      }
    } catch (error) {
      setMessage('Error updating README.md');
    }
  };

  const markRelease = async (repoFullName) => {
    try {
      const response = await fetch(`https://cod3-nexus-api.onrender.com/repos/${repoFullName}/releases`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tag_name: releaseTag,
          name: releaseTag,
          body: `Release ${releaseTag}`
        })
      });

      if (!response.ok) {
        setMessage('Error marking release');
      }
    } catch (error) {
      setMessage('Error marking release');
    }
  };

  const toBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSearchChange = (event) => {
    const search = event.target.value;
    setSearchTerm(search);
    filterAndSortRepositories(search, sortOption);
  };

  const handleSortChange = (event) => {
    const sort = event.target.value;
    setSortOption(sort);
    filterAndSortRepositories(searchTerm, sort);
  };

  const filterAndSortRepositories = (search, sort) => {
    let filtered = repositories.filter(repo =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(search.toLowerCase()))
    );

    filtered = filtered.sort((a, b) => {
      if (sort === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sort === 'stars') {
        return b.stargazers_count - a.stargazers_count;
      } else if (sort === 'created') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return 0;
    });

    setFilteredRepositories(filtered);
  };

  const indexOfLastRepo = currentPage * reposPerPage;
  const indexOfFirstRepo = indexOfLastRepo - reposPerPage;
  const currentRepos = filteredRepositories.slice(indexOfFirstRepo, indexOfLastRepo);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Cod3 Nexus</h1>
        <p>Streamline repository management tasks while offering insights into user GitHub profiles and achievements</p>
      </header>
      <main className='main-content'>
        <div className="forms-container">
          <form onSubmit={handleFormSubmit} className="form">
            <h2>Get Repositories</h2>
            <input
              type="text"
              name="username"
              placeholder="Enter GitHub username"
              value={username}
              onChange={handleInputChange}
            />
            <button type="submit">Get Repositories</button>
          </form>
          <form onSubmit={handleRepoSubmit} className="form">
            <h2>Create Repository</h2>
            <input
              type="text"
              name="token"
              placeholder="Enter GitHub token"
              value={token}
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="repoName"
              placeholder="Enter new repository name"
              value={repoName}
              onChange={handleInputChange}
            />
            <label>
              <input
                type="checkbox"
                name="isPrivate"
                checked={isPrivate}
                onChange={handleCheckboxChange}
              />
              Private Repository
            </label>
            <label>
              <input
                type="checkbox"
                name="includeReadme"
                checked={includeReadme}
                onChange={handleCheckboxChange}
              />
              Initialize with README
            </label>
            <label>
              Upload Files:
              <input
                type="file"
                name="files"
                multiple
                onChange={handleFileChange}
              />
            </label>
            {files.length > 0 && (
              <div>
                <h3>Selected Files:</h3>
                <ul>
                  {files.map((file, index) => (
                    <li key={index}>
                      {file.name}
                      <button type="button" onClick={() => removeFile(file)}>Remove</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <input
              type="text"
              name="releaseTag"
              placeholder="Enter release tag"
              value={releaseTag}
              onChange={handleInputChange}
            />
            <button type="submit">Create Repository</button>
          </form>
        </div>
        <div className="repository-controls">
          <input
            type="text"
            placeholder="Search Repositories"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <select value={sortOption} onChange={handleSortChange}>
            <option value="name">Name</option>
            <option value="stars">Stars</option>
            <option value="created">Created Date</option>
          </select>
        </div>
        {message && <p className="message">{message}</p>}
        {userStats && (
          <div className="github-stats">
            <h2>GitHub Stats</h2>
            <div className="github-stat-item">
              <img src={`https://github-readme-stats.vercel.app/api?username=${username}&show_icons=true&theme=radical`} alt="GitHub Stats" />
            </div>
            <div className="github-stat-item">
              <img src={`https://github-readme-stats.vercel.app/api/top-langs/?username=${username}&layout=compact&theme=radical`} alt="Github stats" />
            </div>
          </div>
        )}
        {currentRepos.length > 0 && (
          <div className="github-repositories">
            <h2>Repositories</h2>
            <ul className="repo-list">
              {currentRepos.map((repo, index) => (
                <li key={index}>
                  <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                    {repo.name}
                  </a>
                </li>
              ))}
            </ul>
            <div className="pagination">
              {[...Array(Math.ceil(filteredRepositories.length / reposPerPage)).keys()].map(number => (
                <button key={number + 1} onClick={() => paginate(number + 1)}>
                  {number + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
