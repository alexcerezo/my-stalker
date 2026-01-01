export interface SuggestedUser {
  username: string;
  avatar: string;
  followedBy: string;
}

interface SuggestedUsersProps {
  users: SuggestedUser[];
  currentUser?: {
    username: string;
    fullName: string;
    avatar: string;
  };
}

export default function SuggestedUsers({ users, currentUser }: SuggestedUsersProps) {
  return (
    <section className="side-menu">
      {currentUser && (
        <div className="side-menu__user-profile">
          <a href="#" className="side-menu__user-avatar">
            <img src={currentUser.avatar} alt="User Picture" />
          </a>
          <div className="side-menu__user-info">
            <a href="#">{currentUser.username}</a>
            <span>{currentUser.fullName}</span>
          </div>
          <button className="side-menu__user-button">Cambiar</button>
        </div>
      )}

      <div className="side-menu__suggestions-section">
        <div className="side-menu__suggestions-header">
          <h2>Personas que quizás conozcas</h2>
          <button>Ver todo</button>
        </div>
        <div className="side-menu__suggestions-content">
          {users.map((user, index) => (
            <div key={index} className="side-menu__suggestion">
              <a href="#" className="side-menu__suggestion-avatar">
                <img src={user.avatar} alt={`${user.username} Picture`} />
              </a>
              <div className="side-menu__suggestion-info">
                <a href="#">{user.username}</a>
                <span>{user.followedBy}</span>
              </div>
              <button className="side-menu__suggestion-button">Seguir</button>
            </div>
          ))}
        </div>
      </div>

      <div className="side-menu__footer">
        <div className="side-menu__footer-links">
          <ul className="side-menu__footer-list">
            <li className="side-menu__footer-item">
              <a className="side-menu__footer-link" href="#">
                Información 
              </a>
            </li>
            <li className="side-menu__footer-item">
              <a className="side-menu__footer-link" href="#">
                Ayuda 
              </a>
            </li>
            <li className="side-menu__footer-item">
              <a className="side-menu__footer-link" href="#">
                Prensa 
              </a>
            </li>
            <li className="side-menu__footer-item">
              <a className="side-menu__footer-link" href="#">
                API 
              </a>
            </li>
            <li className="side-menu__footer-item">
              <a className="side-menu__footer-link" href="#">
                Trabajos 
              </a>
            </li>
            <li className="side-menu__footer-item">
              <a className="side-menu__footer-link" href="#">
                Privacidad 
              </a>
            </li>
            <li className="side-menu__footer-item">
              <a className="side-menu__footer-link" href="#">
                Términos 
              </a>
            </li>
            <li className="side-menu__footer-item">
              <a className="side-menu__footer-link" href="#">
                Ubicaciones 
              </a>
            </li>
            <li className="side-menu__footer-item">
              <a className="side-menu__footer-link" href="#">
                Cuentas principales 
              </a>
            </li>
            <li className="side-menu__footer-item">
              <a className="side-menu__footer-link" href="#">
                Hashtag 
              </a>
            </li>
            <li className="side-menu__footer-item">
              <a className="side-menu__footer-link" href="#">
                Idioma 
              </a>
            </li>
          </ul>
        </div>

        <span className="side-menu__footer-copyright">
          &copy; 2025 instagram de meta
        </span>
      </div>
    </section>
  );
}
