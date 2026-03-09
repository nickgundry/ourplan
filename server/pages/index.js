export default function Home() {
  return (
    <main style={styles.main}>
      <h1 style={styles.title}>Prepared</h1>
      <p style={styles.subtitle}>Disaster readiness API</p>
      <p style={styles.muted}>
        This is the backend for the Prepared mobile app. Use the app to manage your plan and contacts.
      </p>
    </main>
  );
}

const styles = {
  main: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem",
    fontFamily: "system-ui, sans-serif",
  },
  title: {
    margin: 0,
    fontSize: "1.75rem",
    fontWeight: 600,
  },
  subtitle: {
    margin: "0.25rem 0 1rem",
    fontSize: "1rem",
    color: "#666",
  },
  muted: {
    margin: 0,
    fontSize: "0.875rem",
    color: "#888",
    maxWidth: "20rem",
    textAlign: "center",
  },
};
