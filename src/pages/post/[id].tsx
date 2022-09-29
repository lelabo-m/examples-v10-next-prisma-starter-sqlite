import { createProxySSGHelpers } from '@trpc/react/ssg';
import * as trpcNext from '@trpc/server/adapters/next';
import { GetServerSidePropsContext } from 'next';
import NextError from 'next/error';
import { useRouter } from 'next/router';
import superjson from 'superjson';
import { NextPageWithLayout } from '~/pages/_app';
import { createContext } from '~/server/context';
import { appRouter } from '~/server/routers/_app';
import { trpc } from '~/utils/trpc';

async function createSSGProxy(opts: trpcNext.CreateNextContextOptions) {
  return createProxySSGHelpers({
    router: appRouter,
    ctx: await createContext(opts),
    transformer: superjson,
  });
}

export async function getServerSideProps(
  context: GetServerSidePropsContext<{ id: string }>,
) {
  const { req, res } = context;

  // This works...
  // const ssg = createProxySSGHelpers({
  //   router: appRouter,
  //   ctx: await createContext({ req, res } as trpcNext.CreateNextContextOptions),
  //   transformer: superjson,
  // });

  // This doesn't work...
  const ssg = await createSSGProxy({
    req,
    res,
  } as trpcNext.CreateNextContextOptions);
  const id = context.params?.id as string;
  /*
   * Prefetching the `post.byId` query here.
   * `prefetch` does not return the result and never throws - if you need that behavior, use `fetch` instead.
   */
  await ssg.post.byId.prefetch({ id });
  // Make sure to return { props: { trpcState: ssg.dehydrate() } }
  return {
    props: {
      trpcState: ssg.dehydrate(),
      id,
    },
  };
}

const PostViewPage: NextPageWithLayout = () => {
  const id = useRouter().query.id as string;
  const postQuery = trpc.post.byId.useQuery({ id });

  if (postQuery.error) {
    return (
      <NextError
        title={postQuery.error.message}
        statusCode={postQuery.error.data?.httpStatus ?? 500}
      />
    );
  }

  if (postQuery.status !== 'success') {
    return <>Loading...</>;
  }
  const { data } = postQuery;
  return (
    <>
      <h1>{data.title}</h1>
      <em>Created {data.createdAt.toLocaleDateString('en-us')}</em>

      <p>{data.text}</p>

      <h2>Raw data:</h2>
      <pre>{JSON.stringify(data, null, 4)}</pre>
    </>
  );
};

export default PostViewPage;
